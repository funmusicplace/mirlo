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
  const tier = await prisma.profileSubscriptionTier.findFirst({
    where: { id: Number(tierId) },
    select: { profileId: true },
  });

  const existingFreeSubscription = tier
    ? await prisma.profileUserSubscription.findFirst({
        where: {
          userId: Number(userId),
          profileSubscriptionTierId: { not: Number(tierId) },
          stripeSubscriptionKey: null,
          profileSubscriptionTier: { profileId: tier.profileId },
        },
      })
    : null;

  const updateData = {
    profileSubscriptionTierId: Number(tierId),
    userId: Number(userId),
    amount,
    deletedAt: null,
    deleteReason: null, // Clear any stale reason from a prior cancellation of this same tier row
    platformCut,
    stripeSubscriptionKey: paymentProcessorKey,
    shippingAddress,
  };

  const includeArgs = {
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
  };

  let profileUserSubscription;
  if (existingFreeSubscription) {
    profileUserSubscription = await prisma.profileUserSubscription.update({
      where: { id: existingFreeSubscription.id },
      data: updateData,
      include: includeArgs,
    });
  } else {
    profileUserSubscription = await prisma.profileUserSubscription.upsert({
      create: {
        profileSubscriptionTierId: tierId,
        userId: userId,
        amount: amount,
        deletedAt: null,
        stripeSubscriptionKey: paymentProcessorKey,
        platformCut,
        shippingAddress,
      },
      update: updateData,
      where: {
        userId_profileSubscriptionTierId: {
          userId: Number(userId),
          profileSubscriptionTierId: Number(tierId),
        },
      },
      include: includeArgs,
    });
  }

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
