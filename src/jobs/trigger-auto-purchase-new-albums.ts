import prisma from "@mirlo/prisma";

import logger from "../logger";
import { autoPurchaseNewAlbumsQueue } from "../queues/auto-purchase-new-albums-queue";
import { whereForPublishedTrackGroups } from "../utils/trackGroup";

export async function triggerAutoPurchaseNewAlbums() {
  const currentDate = new Date();
  const oneHourAgo = new Date(currentDate.getTime() - 60 * 60 * 1000);

  const recentAlbums = await prisma.trackGroup.findMany({
    where: {
      ...whereForPublishedTrackGroups(),
      hideFromSearch: undefined,
      publishedAt: {
        gte: oneHourAgo,
        lte: currentDate,
      },
    },
  });

  logger.info(
    `triggerAutoPurchaseNewAlbums: found ${recentAlbums.length} new albums`
  );

  for (const album of recentAlbums) {
    const artistSubscribers = await prisma.profileUserSubscription.findMany({
      where: {
        amount: {
          gte: 0,
        },
        deletedAt: null,
        profileSubscriptionTier: {
          autoPurchaseAlbums: true,
          OR: [
            { profileId: album.profileId },
            {
              profile: {
                user: {
                  artistLabels: {
                    some: {
                      artistId: album.profileId,
                      isLabelApproved: true,
                      isArtistApproved: true,
                    },
                  },
                },
              },
            },
          ],
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
          profileUserSubscriptionId: subscriber.id,
        },
        { removeOnComplete: true }
      );
    }
  }
}
