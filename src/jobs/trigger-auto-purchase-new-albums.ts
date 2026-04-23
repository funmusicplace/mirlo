import prisma from "@mirlo/prisma";
import logger from "../logger";
import { autoPurchaseNewAlbumsQueue } from "../queues/auto-purchase-new-albums-queue";

/**
 * Trigger function: Finds recently published albums and enqueues auto-purchase jobs
 * Runs on a schedule to find albums published to Mirlo in the last hour. Uses
 * publishedAt (not releaseDate) so back-catalog uploads — where releaseDate is
 * the album's historical release but publishedAt is when the artist uploaded —
 * still trigger auto-purchase for followers.
 */
export async function triggerAutoPurchaseNewAlbums() {
  const currentDate = new Date();
  const oneHourAgo = new Date(currentDate.getTime() - 60 * 60 * 1000);

  const recentAlbums = await prisma.trackGroup.findMany({
    where: {
      publishedAt: {
        gte: oneHourAgo,
        lte: currentDate,
      },
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
