import prisma from "@mirlo/prisma";

import { AppError } from "../error";
import { calculateAppFee } from "../processingPayments";
import { createOnlinePaymentIntent } from "../stripe";
import { getCurrency } from "../stripe/sessions";
import {
  createTerminalPaymentIntent,
  processPaymentOnReader,
  createAndDispatchTerminalSetupIntent,
} from "../stripe/terminal";

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
  stripeAccountId: stripeAccountIdOverride,
}: {
  readerId?: string;
  artistId: number;
  items: ResolvedItem[];
  userEmail: string;
  userId?: string;
  /** Pre-resolved account ID — use when the item (e.g. trackGroup) has its own paymentToUser that takes precedence over the artist's. */
  stripeAccountId?: string;
}): Promise<{ paymentIntentId: string } | { clientSecret: string | null }> => {
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

  const purchaseTypes = [...new Set(items.map((i) => i.type))];
  const purchaseType = purchaseTypes.length === 1 ? purchaseTypes[0] : "merch";

  const metadata: Record<string, string> = {
    purchaseType,
    stripeAccountId,
    artistId: String(artistId),
    userEmail,
    ...(userId && { userId }),
    ...(purchaseType === "trackGroup" &&
      items[0]?.id && { trackGroupId: items[0].id }),
    items: JSON.stringify(items),
  };

  if (readerId) {
    const paymentIntent = await createTerminalPaymentIntent({
      totalAmount,
      currency,
      stripeAccountId,
      applicationFeeAmount,
      metadata,
    });
    await processPaymentOnReader({
      readerId,
      paymentIntentId: paymentIntent.id,
      stripeAccountId,
    });
    return { paymentIntentId: paymentIntent.id };
  }

  const paymentIntent = await createOnlinePaymentIntent({
    amount: totalAmount,
    currency,
    stripeAccountId,
    applicationFeeAmount,
    metadata,
  });
  return { clientSecret: paymentIntent.client_secret };
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

  return createAndDispatchTerminalSetupIntent({
    readerId,
    tierId,
    artistId,
    stripeAccountId,
    amount: resolvedAmount,
    currency,
    userEmail,
    userId,
  });
};
