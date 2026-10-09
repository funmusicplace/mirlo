import prisma from "@mirlo/prisma";

import stripe from ".";

export const getCurrency = async (
  profileId: number,
  stripeAccountId: string
): Promise<string> => {
  const profile = await prisma.profile.findUnique({
    where: {
      id: profileId,
    },
    select: { paymentToUserId: true, userId: true },
  });
  if (profile) {
    const user = await prisma.user.findFirst({
      where: {
        id: profile.paymentToUserId ?? profile.userId,
      },
    });
    if (user?.currency) {
      return user.currency.toLowerCase();
    }
  }
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account.default_currency ?? "usd";
  } catch {
    return "usd";
  }
};
