import prisma from "@mirlo/prisma";

import logger from "../../logger";

const endExpiredSubscriptions = async () => {
  const expired = await prisma.profileUserSubscription.findMany({
    where: {
      expiresAt: { lte: new Date() },
      stripeSubscriptionKey: null,
    },
    include: { profileSubscriptionTier: true },
  });

  for (const row of expired) {
    const defaultTier = await prisma.profileSubscriptionTier.findFirst({
      where: {
        profileId: row.profileSubscriptionTier.profileId,
        isDefaultTier: true,
      },
    });
    const followRow =
      defaultTier &&
      (await prisma.profileUserSubscription.findFirst({
        where: {
          userId: row.userId,
          profileSubscriptionTierId: defaultTier.id,
          deletedAt: {},
        },
      }));

    if (defaultTier && !followRow) {
      await prisma.profileUserSubscription.update({
        where: { id: row.id },
        data: {
          profileSubscriptionTierId: defaultTier.id,
          amount: 0,
          expiresAt: null,
        },
      });
    } else {
      await prisma.profileUserSubscription.deleteMany({
        where: { id: row.id },
      });
    }
  }

  logger.info(
    `endExpiredSubscriptions: ended ${expired.length} expired free subscriptions`
  );
};

export default endExpiredSubscriptions;
