import prisma from "@mirlo/prisma";
import logger from "../logger";

/**
 * Core business logic for ending a pre-order campaign.
 * Used by both the manual endpoint and the scheduled job.
 *
 * Wrapped in a Prisma interactive transaction so that all DB
 * mutations either succeed together or roll back together.
 */
export const endPreorderForTrackGroup = async (
  trackGroupId: number,
  makeTracksPreviewable: boolean
) => {
  return prisma.$transaction(async (tx) => {
    await tx.trackGroup.update({
      where: { id: trackGroupId },
      data: {
        isPreorder: false,
        scheduleEndOnReleaseDate: false,
        makeTracksPreviewableOnRelease: false,
      },
    });

    if (makeTracksPreviewable) {
      await tx.track.updateMany({
        where: { trackGroupId },
        data: { isPreview: true },
      });

      await tx.trackGroup.update({
        where: { id: trackGroupId },
        data: { defaultIsPreview: true },
      });
    }

    const trackGroup = await tx.trackGroup.findFirst({
      where: { id: trackGroupId },
    });

    if (!trackGroup) {
      logger.error(
        `endPreorder: trackGroup ${trackGroupId} not found after update`
      );
      return null;
    }

    const isPublished =
      trackGroup.publishedAt && trackGroup.publishedAt <= new Date();

    if (isPublished) {
      const artistFollowers = await tx.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTier: {
            artistId: trackGroup.artistId,
          },
        },
      });

      await tx.notification.createMany({
        data: artistFollowers.map((follower) => ({
          userId: follower.userId,
          trackGroupId,
          notificationType: "NEW_ARTIST_ALBUM" as const,
        })),
      });
    }

    return trackGroup;
  });
};
