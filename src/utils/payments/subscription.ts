// Subscription lifecycle: creating a subscription (terminal or online) and
// cancelling one. Kept separate from purchase.ts (one-time charges) since a
// recurring Stripe Subscription has a materially different lifecycle —
// SetupIntent-based authorisation up front, then billing that recurs on its
// own without a Mirlo-initiated charge each cycle.

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

import { sendSubscriptionCancellationEmail } from "../artist";
import { AppError } from "../error";

import { getPaymentProcessor } from "./PaymentProcessor";
import { resolveArtistPaymentContext } from "./purchase";

// Shared by the terminal and online paths below. Validates the tier first so
// a missing tier 404s even when the artist hasn't finished setting up a
// payment processor (resolveArtistPaymentContext, called after this).
const resolveTierAndAmount = async (
  artistId: number,
  tierId: number,
  amount?: number
) => {
  const tier = await prisma.profileSubscriptionTier.findFirst({
    where: { id: tierId, artistId, deletedAt: null },
    include: { artist: true },
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
  /** Optional override; falls back to the tier's default/min amount. */
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

/**
 * Starts (or switches) an online subscription. A tier switch never cancels
 * the existing subscription up front — either it's repriced in place
 * (fast path, no card re-entry, existing subscription id kept as-is) or, when
 * that's not possible, the old tier is only cancelled once the new
 * SetupIntent is confirmed (see `finalizeSubscriptionSetup` in
 * `src/utils/stripe/index.ts`).
 */
export const initiateOnlineSubscription = async ({
  artistId,
  tierId,
  amount,
  userEmail,
  userId,
  userName,
}: {
  artistId: number;
  tierId: number;
  /** Optional override; falls back to the tier's default/min amount. */
  amount?: number;
  userEmail: string;
  userId?: number;
  /** Self-chosen display name, captured when the buyer has no account name yet. */
  userName?: string;
}): Promise<
  { success: true } | { clientSecret: string | null; stripeAccountId: string }
> => {
  const { tier, resolvedAmount } = await resolveTierAndAmount(
    artistId,
    tierId,
    amount
  );

  // Independent lookups — the account/currency and any existing subscription
  // don't depend on each other, so resolve them concurrently.
  const [{ stripeAccountId, currency }, existingSubscription] =
    await Promise.all([
      resolveArtistPaymentContext(artistId),
      userId
        ? prisma.profileUserSubscription.findFirst({
            where: { userId, artistSubscriptionTier: { artistId } },
          })
        : null,
    ]);

  const isTierSwitch =
    !!existingSubscription &&
    existingSubscription.artistSubscriptionTierId !== tier.id;

  // Fast path: already paying for a tier on this artist, and the new tier
  // doesn't need a shipping address collected — reprice the existing Stripe
  // subscription in place instead of sending the buyer through Checkout
  // again. Nothing is cancelled; the same subscription just bills the new
  // amount next cycle.
  if (
    isTierSwitch &&
    existingSubscription.stripeSubscriptionKey &&
    !tier.collectAddress
  ) {
    await getPaymentProcessor().updateSubscriptionTier({
      subscriptionKey: existingSubscription.stripeSubscriptionKey,
      accountId: stripeAccountId,
      tier,
      amount: resolvedAmount,
      currency,
    });

    const platformPercent = tier.platformPercent ?? 7;
    await prisma.profileUserSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        artistSubscriptionTierId: tier.id,
        amount: resolvedAmount,
        // Keep in step with the new tier's fee — mirrors the
        // application_fee_percent update in updateSubscriptionTier, since the
        // next invoice bills at this percentage going forward.
        platformCut: Math.round((resolvedAmount * platformPercent) / 100),
      },
    });

    return { success: true };
  }

  const { clientSecret } =
    await getPaymentProcessor().createOnlineSubscriptionSetup({
      tierId,
      artistId,
      accountId: stripeAccountId,
      amount: resolvedAmount,
      currency,
      userEmail,
      userId: userId ? String(userId) : undefined,
      userName,
      oldTierId: isTierSwitch
        ? existingSubscription.artistSubscriptionTierId
        : undefined,
    });

  return { clientSecret, stripeAccountId };
};

type CancellableSubscription = Prisma.ProfileUserSubscriptionGetPayload<{
  include: { artistSubscriptionTier: true };
}>;

// Cancels a user's subscription to an artist and emails them a confirmation.
// Paid subscriptions (with a `stripeSubscriptionKey`) are cancelled at period
// end: billing stops but the row is kept — access stays until the processor's
// subscription-deleted webhook flips `deletedAt` when the paid period ends. We
// record `deleteReason` now so the UI can show a "cancellation scheduled" state.
// Free/follow tiers have no paid period to honour, so they are removed
// immediately.
export const cancelUserSubscription = async (
  subscription: CancellableSubscription,
  userEmail: string
) => {
  const artistId = subscription.artistSubscriptionTier.artistId;

  // Cancellation only needs the connected account — not the currency that
  // resolveArtistPaymentContext also fetches from Stripe — so resolve the
  // artist + account directly here. We don't filter on `enabled` so a
  // subscription to a since-disabled artist can still be cancelled.
  const artist = await prisma.profile.findFirst({
    where: { id: artistId },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });
  const stripeAccountId =
    artist?.paymentToUser?.stripeAccountId ?? artist?.user.stripeAccountId;

  if (subscription.stripeSubscriptionKey) {
    if (stripeAccountId) {
      await getPaymentProcessor().cancelSubscription({
        subscriptionKey: subscription.stripeSubscriptionKey,
        accountId: stripeAccountId,
        atPeriodEnd: true,
      });
    }

    // Keep the row until the processor's webhook flips `deletedAt` at period
    // end; record the reason now so the UI can show a "cancelled" state.
    await prisma.profileUserSubscription.update({
      where: { id: subscription.id },
      data: { deleteReason: "USER_CANCELLED" },
    });
  } else {
    // Free/follow tier: no paid period to honour, so remove it outright.
    await prisma.profileUserSubscription.deleteMany({
      where: { id: subscription.id },
    });
  }

  if (artist) {
    await sendSubscriptionCancellationEmail(
      userEmail,
      artist,
      subscription.stripeSubscriptionKey ? subscription.nextBillingDate : null
    );
  }
};
