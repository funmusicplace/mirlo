import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { uniq } from "lodash";

import { sendSubscriptionCancellationEmail } from "../artist";
import { AppError } from "../error";
import { calculateAppFee } from "../processingPayments";
import { getCurrency } from "../stripe/sessions";

import { getPaymentProcessor } from "./PaymentProcessor";

export type ResolvedItem = {
  type: "trackGroup" | "merch" | "tip";
  id?: string;
  quantity: number;
  amount: number;
  message?: string;
};

// Fetches the artist and resolves the connected Stripe account + currency used
// for all payment operations. Shared by initiatePayment and initiateSubscription.
const resolveArtistPaymentContext = async (
  artistId: number,
  stripeAccountIdOverride?: string
) => {
  const artist = await prisma.artist.findFirst({
    where: { id: artistId, enabled: true },
    include: {
      user: { select: { stripeAccountId: true, email: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });

  if (!artist) {
    throw new Error(`Artist ${artistId} not found`);
  }

  const stripeAccountId =
    stripeAccountIdOverride ??
    artist.paymentToUser?.stripeAccountId ??
    artist.user.stripeAccountId;

  if (!stripeAccountId) {
    throw new Error("Artist is not set up with a payment processor");
  }

  const currency = await getCurrency(artistId, stripeAccountId);

  return { artist, stripeAccountId, currency };
};

// Initiates a payment against the artist's connected account.
export const initiatePayment = async ({
  readerId,
  artistId,
  items,
  userEmail,
  userId,
  clientId,
  successUrl,
  stripeAccountId: stripeAccountIdOverride,
}: {
  readerId?: string;
  artistId: number;
  items: ResolvedItem[];
  userEmail: string;
  userId?: string;
  /** Registered API consumer (Client.id) — carried in metadata so the post-payment return can bounce to that client's applicationUrl. */
  clientId?: number;
  /** Where the hosted checkout page returns the buyer after payment (validated upstream). */
  successUrl?: string;
  /** Pre-resolved account ID — use when the item (e.g. trackGroup) has its own paymentToUser that takes precedence over the artist's. */
  stripeAccountId?: string;
}): Promise<
  | { paymentIntentId: string }
  | {
      clientSecret: string | null;
      stripeAccountId: string;
      paymentIntentId: string;
    }
> => {
  const { artist, stripeAccountId, currency } =
    await resolveArtistPaymentContext(artistId, stripeAccountIdOverride);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const applicationFeeAmount = await calculateAppFee(
    totalAmount,
    currency,
    artist.properties
      ? (artist.properties as { defaultPlatformFee?: number })
          .defaultPlatformFee
      : undefined
  );

  const purchaseTypes = uniq(items.map((i) => i.type));
  const purchaseType = purchaseTypes.length === 1 ? purchaseTypes[0] : "merch";

  const metadata: Record<string, string> = {
    purchaseType,
    stripeAccountId,
    artistId: String(artistId),
    userEmail,
    ...(userId && { userId }),
    ...(clientId !== undefined && { clientId: String(clientId) }),
    ...(successUrl && { successUrl }),
    ...(purchaseType === "trackGroup" &&
      items[0]?.id && { trackGroupId: items[0].id }),
    items: JSON.stringify(items),
  };

  const processor = getPaymentProcessor();

  if (readerId) {
    const { id } = await processor.createTerminalPayment({
      amount: totalAmount,
      currency,
      accountId: stripeAccountId,
      applicationFeeAmount,
      metadata,
      readerId,
    });
    return { paymentIntentId: id };
  }

  const { id, clientSecret } = await processor.createOnlinePayment({
    amount: totalAmount,
    currency,
    accountId: stripeAccountId,
    applicationFeeAmount,
    metadata,
  });
  return {
    clientSecret,
    stripeAccountId,
    paymentIntentId: id,
  };
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
  // Validate the tier first so a missing tier returns 404 even when the artist
  // has not finished setting up a payment processor (which throws below).
  const tier = await prisma.artistSubscriptionTier.findFirst({
    where: { id: tierId, artistId, deletedAt: null },
    select: { id: true, minAmount: true, defaultAmount: true },
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

type CancellableSubscription = Prisma.ArtistUserSubscriptionGetPayload<{
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
  const artist = await prisma.artist.findFirst({
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
    await prisma.artistUserSubscription.update({
      where: { id: subscription.id },
      data: { deleteReason: "USER_CANCELLED" },
    });
  } else {
    // Free/follow tier: no paid period to honour, so remove it outright.
    await prisma.artistUserSubscription.deleteMany({
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
