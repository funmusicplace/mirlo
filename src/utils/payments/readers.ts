import prisma from "@mirlo/prisma";

import { getPaymentProcessor, TerminalReader } from "./PaymentProcessor";

/**
 * Terminal readers registered on the profile's connected payment-processor
 * account. Resolving profile → account happens here so callers (routers) never
 * touch processor-specific fields like `stripeAccountId`.
 */
export const listProfileReaders = async (
  profileId: number
): Promise<TerminalReader[]> => {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId },
    include: {
      user: { select: { stripeAccountId: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });

  const accountId =
    profile?.paymentToUser?.stripeAccountId ?? profile?.user.stripeAccountId;

  // No payment processor connected — nothing to list, but not an error: the
  // POS page shows its own "no connected account" warning.
  if (!accountId) {
    return [];
  }

  return getPaymentProcessor().listReaders({ accountId });
};
