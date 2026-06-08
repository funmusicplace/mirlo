import prisma from "@mirlo/prisma";

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
  amount: number;
  userEmail: string;
  userId?: string;
}): Promise<{ setupIntentId: string }> => {
  const artist = await prisma.artist.findFirst({
    where: { id: artistId, enabled: true },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });

  if (!artist) {
    throw new Error(`Artist ${artistId} not found`);
  }

  const stripeAccountId =
    artist.paymentToUser?.stripeAccountId ?? artist.user.stripeAccountId;

  if (!stripeAccountId) {
    throw new Error("Artist is not set up with a payment processor");
  }

  const currency = await getCurrency(artistId, stripeAccountId);

  return createAndDispatchTerminalSetupIntent({
    readerId,
    tierId,
    artistId,
    stripeAccountId,
    amount,
    currency,
    userEmail,
    userId,
  });
};
