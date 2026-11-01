// Subscription lifecycle: creating a subscription (terminal or online),
// switching its tier and cancelling it. Kept separate from purchase.ts
// (one-time charges) since a recurring Stripe Subscription has a materially
// different lifecycle — SetupIntent-based authorisation up front, then
// billing that recurs on its own without a Mirlo-initiated charge each cycle.

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

import logger from "../../logger";
import { sendSubscriptionCancellationEmail } from "../artist";
import { AppError } from "../error";
import { calculatePlatformPercent } from "../processingPayments";
import {
  registerSubscription,
  retireOtherTierSubscriptions,
} from "../subscriptionTier";

import { resolvePayee } from "./payee";
import {
  getPaymentProcessor,
  type DeferredQuote,
  type ShippingAddress,
} from "./PaymentProcessor";
import { resolveProfilePaymentContext } from "./purchase";

const resolveTierAndAmount = async (
  profileId: number,
  tierId: number,
  amount?: number
) => {
  const tier = await prisma.profileSubscriptionTier.findFirst({
    where: { id: tierId, profileId, deletedAt: null },
    include: { profile: true },
  });
  if (!tier) {
    throw new AppError({
      httpCode: 404,
      description: "Subscription tier not found",
    });
  }

  const tierPrice = tier.minAmount ?? tier.defaultAmount ?? 0;
  if (amount !== undefined && !tier.allowVariable && amount !== tierPrice) {
    throw new AppError({
      httpCode: 400,
      description: "This subscription tier has a fixed price",
    });
  }

  const resolvedAmount = amount ?? tierPrice;
  if (resolvedAmount <= 0) {
    throw new AppError({
      httpCode: 400,
      description: "Subscription amount must be greater than 0",
    });
  }
  if (resolvedAmount < (tier.minAmount ?? 0)) {
    throw new AppError({
      httpCode: 400,
      description: "Subscription amount is below the tier's minimum",
    });
  }
  if (tier.maxAmount && resolvedAmount > tier.maxAmount) {
    throw new AppError({
      httpCode: 400,
      description: "Subscription amount is above the tier's maximum",
    });
  }

  return { tier, resolvedAmount };
};

const refuseGuestWithPaidSubscription = async (
  profileId: number,
  userEmail: string
) => {
  const paidSubscription = await prisma.profileUserSubscription.findFirst({
    where: {
      user: { email: { equals: userEmail, mode: "insensitive" } },
      profileSubscriptionTier: { profileId },
      stripeSubscriptionKey: { not: null },
    },
  });
  if (paidSubscription) {
    throw new AppError({
      httpCode: 409,
      description:
        "This email already has a subscription to this artist. Log in to Mirlo to change it.",
    });
  }
};

export const initiateSubscription = async ({
  readerId,
  profileId,
  tierId,
  amount,
  userEmail,
  userId,
}: {
  readerId: string;
  profileId: number;
  tierId: number;
  amount?: number;
  userEmail: string;
  userId?: string;
}): Promise<{ setupIntentId: string }> => {
  const { resolvedAmount } = await resolveTierAndAmount(
    profileId,
    tierId,
    amount
  );

  if (!userEmail) {
    throw new AppError({
      httpCode: 400,
      description: "A subscription at a card reader needs the buyer's email",
    });
  }

  if (!userId) {
    await refuseGuestWithPaidSubscription(profileId, userEmail);
  }

  const { stripeAccountId, currency } =
    await resolveProfilePaymentContext(profileId);

  return getPaymentProcessor().createTerminalSubscriptionSetup({
    readerId,
    tierId,
    profileId,
    accountId: stripeAccountId,
    amount: resolvedAmount,
    currency,
    userEmail,
    userId,
  });
};

export const initiateOnlineSubscription = async ({
  profileId,
  tierId,
  amount,
  userEmail,
  userId,
  userName,
  deferred,
  shippingAddress,
  checkoutId,
}: {
  profileId: number;
  tierId: number;
  amount?: number;
  userEmail: string;
  userId?: number;
  userName?: string;
  /** Resolve what the checkout needs to render, without creating a SetupIntent. */
  deferred?: boolean;
  shippingAddress?: ShippingAddress;
  checkoutId?: string;
}): Promise<
  | { deferred: DeferredQuote }
  | {
      clientSecret: string | null;
      stripeAccountId: string;
      setupIntentId: string;
      requiresShipping: boolean;
    }
> => {
  const { tier, resolvedAmount } = await resolveTierAndAmount(
    profileId,
    tierId,
    amount
  );

  const [{ stripeAccountId, currency }, existingSubscription] =
    await Promise.all([
      resolveProfilePaymentContext(profileId),
      userId
        ? prisma.profileUserSubscription.findFirst({
            where: {
              userId,
              profileSubscriptionTier: { profileId: profileId },
            },
          })
        : null,
    ]);

  if (!userId && userEmail) {
    await refuseGuestWithPaidSubscription(profileId, userEmail);
  }

  const isTierSwitch =
    !!existingSubscription &&
    existingSubscription.profileSubscriptionTierId !== tier.id;

  const oldStripeSubscriptionKey =
    existingSubscription?.stripeSubscriptionKey ?? undefined;

  const requiresShipping = !!tier.collectAddress;

  if (deferred) {
    return {
      deferred: {
        mode: "setup",
        amount: resolvedAmount,
        interval: tier.interval,
        replacesSubscription: !!oldStripeSubscriptionKey,
        currency,
        stripeAccountId,
        requiresShipping,
      },
    };
  }

  const { setupIntentId, clientSecret } =
    await getPaymentProcessor().createOnlineSubscriptionSetup({
      tierId,
      profileId,
      accountId: stripeAccountId,
      amount: resolvedAmount,
      currency,
      userEmail,
      userId: userId ? String(userId) : undefined,
      userName,
      oldTierId: isTierSwitch
        ? existingSubscription.profileSubscriptionTierId
        : undefined,
      oldStripeSubscriptionKey,
      shippingAddress,
      checkoutId,
    });

  return {
    clientSecret,
    stripeAccountId,
    setupIntentId,
    requiresShipping,
  };
};

export const switchSubscriptionTier = async (
  subscription: Prisma.ProfileUserSubscriptionGetPayload<{
    include: { profileSubscriptionTier: true };
  }>,
  tierId: number
) => {
  const { profileId } = subscription.profileSubscriptionTier;
  const { tier, resolvedAmount } = await resolveTierAndAmount(
    profileId,
    tierId
  );

  if (tier.id === subscription.profileSubscriptionTierId) {
    throw new AppError({
      httpCode: 400,
      description: "Already subscribed to this tier",
    });
  }
  if (!subscription.stripeSubscriptionKey) {
    throw new AppError({
      httpCode: 400,
      description: "Only a paid subscription can switch tiers",
    });
  }
  if (tier.collectAddress && !subscription.shippingAddress) {
    throw new AppError({
      httpCode: 400,
      description:
        "This tier needs a shipping address, so it has to be chosen through checkout",
    });
  }

  const { stripeAccountId, currency } = await resolveProfilePaymentContext(
    profileId,
    subscription.stripeAccountId ?? undefined
  );

  const { nextBillingDate } =
    await getPaymentProcessor().updateSubscriptionTier({
      subscriptionKey: subscription.stripeSubscriptionKey,
      accountId: stripeAccountId,
      tier,
      amount: resolvedAmount,
      currency,
    });

  const platformPercent = await calculatePlatformPercent(
    currency || "usd",
    tier.platformPercent ?? tier.profile.defaultPlatformFee
  );
  const moved = await registerSubscription({
    userId: subscription.userId,
    tierId: tier.id,
    amount: resolvedAmount,
    paymentProcessorKey: subscription.stripeSubscriptionKey,
    stripeAccountId,
    platformCut: Math.round((resolvedAmount * platformPercent) / 100),
    shippingAddress: subscription.shippingAddress as object | null,
    nextBillingDate: nextBillingDate ?? subscription.nextBillingDate,
  });
  await retireOtherTierSubscriptions({
    userId: subscription.userId,
    tierId: tier.id,
    profileId,
  });

  return prisma.profileUserSubscription.findUniqueOrThrow({
    where: { id: moved.id },
  });
};

/**
 * Starts a payment-method update for an existing paid subscription
 */
export const initiateSubscriptionPaymentMethodUpdate = async (
  subscription: Prisma.ProfileUserSubscriptionGetPayload<{
    include: { profileSubscriptionTier: true };
  }>
): Promise<{ clientSecret: string | null; stripeAccountId: string }> => {
  if (!subscription.stripeSubscriptionKey) {
    throw new AppError({
      httpCode: 400,
      description: "This subscription has no payment method to update",
    });
  }

  const { stripeAccountId } = await resolveProfilePaymentContext(
    subscription.profileSubscriptionTier.profileId,
    subscription.stripeAccountId ?? undefined
  );

  const { clientSecret } =
    await getPaymentProcessor().createSubscriptionPaymentMethodSetup({
      subscriptionKey: subscription.stripeSubscriptionKey,
      accountId: stripeAccountId,
    });

  return { clientSecret, stripeAccountId };
};

type CancellableSubscription = Prisma.ProfileUserSubscriptionGetPayload<{
  include: { profileSubscriptionTier: true };
}>;

export const cancelUserSubscription = async (
  subscription: CancellableSubscription,
  userEmail: string,
  keepFollowing: boolean = false,
  cancelledByArtist: boolean = false
) => {
  const profileId = subscription.profileSubscriptionTier.profileId;

  const profile = await prisma.profile.findFirst({
    where: { id: profileId },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });
  const stripeAccountId =
    subscription.stripeAccountId ??
    (profile ? resolvePayee({ profile }).stripeAccountId : null);

  if (subscription.stripeSubscriptionKey) {
    if (stripeAccountId) {
      await getPaymentProcessor().cancelSubscription({
        subscriptionKey: subscription.stripeSubscriptionKey,
        accountId: stripeAccountId,
        atPeriodEnd: true,
      });
    }

    logger.info(
      `Cancelling user ${subscription.userId} their subscription ${subscription.id} to profile ${profileId} (${profile?.name}).`
    );
    await prisma.profileUserSubscription.update({
      where: { id: subscription.id },
      data: {
        deleteReason: cancelledByArtist ? "ARTIST_CANCELLED" : "USER_CANCELLED",
        keepFollowingOnCancel: keepFollowing,
      },
    });
  } else {
    // Free/follow tier
    if (cancelledByArtist) {
      await prisma.profileUserSubscription.update({
        where: { id: subscription.id },
        data: { deleteReason: "ARTIST_CANCELLED" },
      });
    }
    await prisma.profileUserSubscription.deleteMany({
      where: { id: subscription.id },
    });
  }

  if (profile) {
    await sendSubscriptionCancellationEmail(
      userEmail,
      profile,
      subscription.stripeSubscriptionKey ? subscription.nextBillingDate : null,
      cancelledByArtist
    );
  }
};
