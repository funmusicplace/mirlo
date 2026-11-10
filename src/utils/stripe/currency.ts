import prisma from "@mirlo/prisma";

import stripe from ".";

export const getCurrency = async (
  profileId: number,
  stripeAccountId?: string
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
  if (!stripeAccountId) {
    return "usd";
  }
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account.default_currency ?? "usd";
  } catch {
    return "usd";
  }
};

const stripeMinimumCharges: Record<string, number> = {
  aed: 200,
  aud: 50,
  brl: 50,
  cad: 50,
  chf: 50,
  czk: 1500,
  dkk: 250,
  eur: 50,
  gbp: 30,
  hkd: 400,
  huf: 17500,
  inr: 50,
  mxn: 1000,
  myr: 200,
  nok: 300,
  nzd: 50,
  pln: 200,
  ron: 200,
  sek: 300,
  sgd: 50,
  thb: 1000,
  usd: 50,
};

export const minimumPledge = (minPledge: number, currency?: string | null) =>
  Math.max(
    minPledge,
    stripeMinimumCharges[currency?.toLowerCase() ?? ""] ?? 50
  );
