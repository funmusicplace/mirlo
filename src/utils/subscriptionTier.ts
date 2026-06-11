import prisma from "@mirlo/prisma";

import logger from "../logger";

export const registerSubscription = async ({
  tierId,
  userId,
  amount,
  paymentProcessorKey,
  platformCut = null,
  shippingAddress = null,
}: {
  tierId: number;
  userId: number;
  amount: number;
  paymentProcessorKey: string;
  platformCut?: number | null;
  shippingAddress?: object | null;
}) => {
  const artistUserSubscription = await prisma.artistUserSubscription.upsert({
    create: {
      artistSubscriptionTierId: tierId,
      userId: userId,
      amount: amount,
      deletedAt: null,
      stripeSubscriptionKey: paymentProcessorKey,
      platformCut,
      shippingAddress,
    },
    update: {
      artistSubscriptionTierId: Number(tierId),
      userId: Number(userId),
      amount,
      deletedAt: null, // Undelete
      platformCut,
      stripeSubscriptionKey: paymentProcessorKey, // FIXME: should this be session id? Maybe subscriptionId?
      shippingAddress,
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
      subscriptionId: artistUserSubscription.id,
    },
  });

  logger.info(`Updated/created ${artistUserSubscription.id}`);

  return artistUserSubscription;
};

/**
 * Grants the logged-in user pro-grata access to all of a subscription tier's
 * releases (the albums attached to the tier). Idempotent: existing purchases
 * are left untouched. Used both when a subscription is paid for (Stripe) and
 * when an artist adds a subscriber for free.
 */
export const grantSubscriptionTierReleases = async ({
  userId,
  tierId,
  userTransactionId = null,
}: {
  userId: number;
  tierId: number;
  userTransactionId?: string | null;
}) => {
  const releases = await prisma.subscriptionTierRelease.findMany({
    where: { tierId },
  });

  await Promise.all(
    releases.map((release) =>
      prisma.userTrackGroupPurchase.upsert({
        where: {
          userId_trackGroupId: {
            userId,
            trackGroupId: release.trackGroupId,
          },
        },
        update: {},
        create: {
          userId,
          trackGroupId: release.trackGroupId,
          userTransactionId: userTransactionId ?? undefined,
          proGratis: true,
        },
      })
    )
  );

  return releases.length;
};
