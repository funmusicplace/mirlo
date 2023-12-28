import prisma from "../../prisma/prisma";
import logger from "../logger";

export const registerSubscription = async ({
  tierId,
  userId,
  amount,
  currency,
  paymentProcessorKey,
}: {
  tierId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentProcessorKey: string;
}) => {
  const artistUserSubscription = await prisma.artistUserSubscription.upsert({
    create: {
      artistSubscriptionTierId: tierId,
      userId: userId,
      amount: amount,
      currency: currency,
      deletedAt: null,
      stripeSubscriptionKey: paymentProcessorKey,
    },
    update: {
      artistSubscriptionTierId: Number(tierId),
      userId: Number(userId),
      amount,
      currency,
      deletedAt: null, // Undelete
      stripeSubscriptionKey: paymentProcessorKey, // FIXME: should this be session id? Maybe subscriptionId?
    },
    where: {
      userId_artistSubscriptionTierId: {
        userId: Number(userId),
        artistSubscriptionTierId: Number(tierId),
      },
    },
    include: {
      user: true,
      artistSubscriptionTier: {
        include: {
          artist: true,
        },
      },
    },
  });

  logger.info(`Updated/created ${artistUserSubscription.id}`);

  return artistUserSubscription;
};
