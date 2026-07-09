import prisma from "@mirlo/prisma";

import { getPaymentProcessor, TerminalReader } from "./PaymentProcessor";

/**
 * Terminal readers registered on the artist's connected payment-processor
 * account. Resolving artist → account happens here so callers (routers) never
 * touch processor-specific fields like `stripeAccountId`.
 */
export const listArtistReaders = async (
  artistId: number
): Promise<TerminalReader[]> => {
  const artist = await prisma.artist.findFirst({
    where: { id: artistId },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });

  const accountId =
    artist?.paymentToUser?.stripeAccountId ?? artist?.user.stripeAccountId;

  // No payment processor connected — nothing to list, but not an error: the
  // POS page shows its own "no connected account" warning.
  if (!accountId) {
    return [];
  }

  return getPaymentProcessor().listReaders({ accountId });
};
