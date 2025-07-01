import prisma from "@mirlo/prisma";
import logger from "../logger";

export const registerSubscription = async ({
  tierId,
  userId,
  amount,
  currency,
  paymentProcessorKey,
  platformCut = null,
}: {
  tierId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentProcessorKey: string;
  platformCut?: number | null;
}) => {
  const artistUserSubscription = await prisma.artistUserSubscription.upsert({
    create: {
      artistSubscriptionTierId: tierId,
      userId: userId,
      amount: amount,
      currency: currency,
      deletedAt: null,
      stripeSubscriptionKey: paymentProcessorKey,
      platformCut,
    },
    update: {
      artistSubscriptionTierId: Number(tierId),
      userId: Number(userId),
      amount,
      currency,
      deletedAt: null, // Undelete
      platformCut,
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
          artist: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      notificationType: "USER_SUBSCRIBED_TO_YOU",
      artistId: artistUserSubscription.artistSubscriptionTier.artistId,
      userId: artistUserSubscription.artistSubscriptionTier.artist.userId,
      relatedUserId: Number(userId),
    },
  });

  logger.info(`Updated/created ${artistUserSubscription.id}`);

  return artistUserSubscription;
};
