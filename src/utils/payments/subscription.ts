// Subscription lifecycle: creating a subscription (terminal or online) and
// cancelling one. Kept separate from purchase.ts (one-time charges) since a
// recurring Stripe Subscription has a materially different lifecycle —
// SetupIntent-based authorisation up front, then billing that recurs on its
// own without a Mirlo-initiated charge each cycle.

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

import logger from "../../logger";
import { sendSubscriptionCancellationEmail } from "../artist";
import { AppError } from "../error";
import { calculatePlatformPercent } from "../processingPayments";

import { getPaymentProcessor } from "./PaymentProcessor";
import { resolveArtistPaymentContext } from "./purchase";

export const SUBSCRIPTION_SHIPPING_ALLOWED_COUNTRIES = [
  "US",
  "GB",
  "CA",
  "AU",
  "NZ",
];

const resolveTierAndAmount = async (
  artistId: number,
  tierId: number,
  amount?: number
) => {
  const tier = await prisma.profileSubscriptionTier.findFirst({
    where: { id: tierId, profileId: artistId, deletedAt: null },
    include: { profile: true },
  });
  if (!tier) {
    throw new AppError({
      httpCode: 404,
      description: "Subscription tier not found",
    });
  }

  const resolvedAmount = amount ?? tier.defaultAmount ?? tier.minAmount ?? 0;
  if (resolvedAmount <= 0) {
    throw new AppError({
      httpCode: 400,
      description: "Subscription amount must be greater than 0",
    });
  }

  return { tier, resolvedAmount };
};

export const initiateSubscription = async ({
  readerId,
  artistId,
  tierId,
  amount,
  userEmail,
  userId,
}: {
  readerId: string;
  artistId: number;
  tierId: number;
  amount?: number;
  userEmail: string;
  userId?: string;
}): Promise<{ setupIntentId: string }> => {
  const { resolvedAmount } = await resolveTierAndAmount(
    artistId,
    tierId,
    amount
  );

  const { stripeAccountId, currency } =
    await resolveArtistPaymentContext(artistId);

  return getPaymentProcessor().createTerminalSubscriptionSetup({
    readerId,
    tierId,
    artistId,
    accountId: stripeAccountId,
    amount: resolvedAmount,
    currency,
    userEmail,
    userId,
  });
};

export const initiateOnlineSubscription = async ({
  artistId,
  tierId,
  amount,
  userEmail,
  userId,
  userName,
  successUrl,
}: {
  artistId: number;
  tierId: number;
  amount?: number;
  userEmail: string;
  userId?: number;
  userName?: string;
  successUrl?: string;
}): Promise<
  | { success: true }
  | {
      clientSecret: string | null;
      stripeAccountId: string;
      setupIntentId: string;
      requiresShipping: boolean;
      allowedCountries?: string[];
    }
> => {
  const { tier, resolvedAmount } = await resolveTierAndAmount(
    artistId,
    tierId,
    amount
  );

  const [{ stripeAccountId, currency }, existingSubscription] =
    await Promise.all([
      resolveArtistPaymentContext(artistId),
      userId
        ? prisma.profileUserSubscription.findFirst({
            where: { userId, profileSubscriptionTier: { profileId: artistId } },
          })
        : null,
    ]);

  const isTierSwitch =
    !!existingSubscription &&
    existingSubscription.profileSubscriptionTierId !== tier.id;

  if (
    isTierSwitch &&
    existingSubscription.stripeSubscriptionKey &&
    (!tier.collectAddress || existingSubscription.shippingAddress)
  ) {
    await getPaymentProcessor().updateSubscriptionTier({
      subscriptionKey: existingSubscription.stripeSubscriptionKey,
      accountId: stripeAccountId,
      tier,
      amount: resolvedAmount,
      currency,
    });

    const platformPercent = await calculatePlatformPercent(
      currency || "usd",
      tier.platformPercent ?? tier.profile.defaultPlatformFee
    );
    await prisma.profileUserSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        profileSubscriptionTierId: tier.id,
        amount: resolvedAmount,
        platformCut: Math.round((resolvedAmount * platformPercent) / 100),
        deleteReason: null,
      },
    });

    return { success: true };
  }

  const oldStripeSubscriptionKey =
    existingSubscription?.stripeSubscriptionKey ?? undefined;

  const requiresShipping = !!tier.collectAddress;
  const allowedCountries = tier.collectAddress
    ? SUBSCRIPTION_SHIPPING_ALLOWED_COUNTRIES
    : undefined;

  const { setupIntentId, clientSecret } =
    await getPaymentProcessor().createOnlineSubscriptionSetup({
      tierId,
      artistId,
      accountId: stripeAccountId,
      amount: resolvedAmount,
      currency,
      userEmail,
      userId: userId ? String(userId) : undefined,
      userName,
      successUrl,
      oldTierId: isTierSwitch
        ? existingSubscription.profileSubscriptionTierId
        : undefined,
      oldStripeSubscriptionKey,
      requiresShipping,
      allowedCountries,
    });

  return {
    clientSecret,
    stripeAccountId,
    setupIntentId,
    requiresShipping,
    allowedCountries,
  };
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

  const { stripeAccountId } = await resolveArtistPaymentContext(
    subscription.profileSubscriptionTier.profileId
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

// Cancels a user's subscription to an artist and emails them a confirmation.
export const cancelUserSubscription = async (
  subscription: CancellableSubscription,
  userEmail: string,
  keepFollowing: boolean = false
) => {
  const artistId = subscription.profileSubscriptionTier.profileId;

  const profile = await prisma.profile.findFirst({
    where: { id: artistId },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });
  const stripeAccountId =
    profile?.paymentToUser?.stripeAccountId ?? profile?.user.stripeAccountId;

  if (subscription.stripeSubscriptionKey) {
    if (stripeAccountId) {
      await getPaymentProcessor().cancelSubscription({
        subscriptionKey: subscription.stripeSubscriptionKey,
        accountId: stripeAccountId,
        atPeriodEnd: true,
      });
    }

    logger.info(
      `Cancelling user ${subscription.userId} their subscription ${subscription.id} to profile ${artistId} (${profile?.name}).`
    );
    await prisma.profileUserSubscription.update({
      where: { id: subscription.id },
      data: {
        deleteReason: "USER_CANCELLED",
        keepFollowingOnCancel: keepFollowing,
      },
    });
  } else {
    // Free/follow tier
    await prisma.profileUserSubscription.deleteMany({
      where: { id: subscription.id },
    });
  }

  if (profile) {
    await sendSubscriptionCancellationEmail(
      userEmail,
      profile,
      subscription.stripeSubscriptionKey ? subscription.nextBillingDate : null
    );
  }
};
