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
  const profileUserSubscription = await prisma.profileUserSubscription.upsert({
    create: {
      profileSubscriptionTierId: tierId,
      userId: userId,
      amount: amount,
      deletedAt: null,
      stripeSubscriptionKey: paymentProcessorKey,
      platformCut,
      shippingAddress,
    },
    update: {
      profileSubscriptionTierId: Number(tierId),
      userId: Number(userId),
      amount,
      deletedAt: null, // Undelete
      platformCut,
      stripeSubscriptionKey: paymentProcessorKey, // FIXME: should this be session id? Maybe subscriptionId?
      shippingAddress,
    },
    where: {
      userId_profileSubscriptionTierId: {
        userId: Number(userId),
        profileSubscriptionTierId: Number(tierId),
      },
    },
    include: {
      user: true,
      profileSubscriptionTier: {
        include: {
          profile: {
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
      profileId: profileUserSubscription.profileSubscriptionTier.profileId,
      userId: profileUserSubscription.profileSubscriptionTier.profile.userId,
      relatedUserId: Number(userId),
      subscriptionId: profileUserSubscription.id,
    },
  });

  logger.info(`Updated/created ${profileUserSubscription.id}`);

  return profileUserSubscription;
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
