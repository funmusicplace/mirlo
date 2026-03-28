import prisma from "@mirlo/prisma";
import logger from "../logger";
import { autoPurchaseNewAlbumsQueue } from "../queues/auto-purchase-new-albums-queue";

/**
 * Trigger function: Finds recent albums and enqueues auto-purchase jobs
 * Runs on a schedule to find albums released in the last hour
 * Enqueues individual jobs for each subscriber that should auto-purchase
 */
export async function triggerAutoPurchaseNewAlbums() {
  const currentDate = new Date();
  const oneHourAgo = new Date();
  oneHourAgo.setHours(currentDate.getHours() - 1);

  const recentAlbums = await prisma.trackGroup.findMany({
    where: {
      releaseDate: {
        gte: oneHourAgo,
        lte: currentDate,
      },
      publishedAt: { lte: new Date() },
      deletedAt: null,
    },
  });

  logger.info(
    `triggerAutoPurchaseNewAlbums: found ${recentAlbums.length} new albums`
  );

  for (const album of recentAlbums) {
    const artistSubscribers = await prisma.artistUserSubscription.findMany({
      where: {
        amount: {
          gte: 0,
        },
        deletedAt: null,
        artistSubscriptionTier: {
          artistId: album.artistId,
          autoPurchaseAlbums: true,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    logger.info(
      `triggerAutoPurchaseNewAlbums: album ${album.id}: found ${artistSubscribers.length} subscribers`
    );

    for (const subscriber of artistSubscribers) {
      logger.info(
        `triggerAutoPurchaseNewAlbums: queueing album ${album.id} for subscription ${subscriber.id}`
      );

      await autoPurchaseNewAlbumsQueue.add(
        "auto-purchase-new-album",
        {
          trackGroupId: album.id,
          artistUserSubscriptionId: subscriber.id,
        },
        { removeOnComplete: true }
      );
    }
  }
}
