import prisma from "@mirlo/prisma";

import stripe from ".";

export const getCurrency = async (
  artistId: number,
  stripeAccountId: string
): Promise<string> => {
  const artist = await prisma.profile.findUnique({
    where: {
      id: artistId,
    },
    select: { paymentToUserId: true, userId: true },
  });
  if (artist) {
    const user = await prisma.user.findFirst({
      where: {
        id: artist.paymentToUserId ?? artist.userId,
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
