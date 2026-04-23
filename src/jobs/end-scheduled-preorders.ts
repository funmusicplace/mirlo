import prisma from "@mirlo/prisma";
import logger from "../logger";
import { endPreorderForTrackGroup } from "../utils/endPreorder";

/**
 * Finds pre-order trackGroups whose release date has passed
 * and automatically ends their pre-order campaign.
 *
 * Runs as part of every-minute-tasks.
 */
export async function endScheduledPreorders() {
  const now = new Date();

  const preordersToEnd = await prisma.trackGroup.findMany({
    where: {
      isPreorder: true,
      scheduleEndOnReleaseDate: true,
      releaseDate: { lte: now },
      deletedAt: null,
    },
  });

  logger.info(
    `endScheduledPreorders: found ${preordersToEnd.length} pre-orders to end`
  );

  for (const trackGroup of preordersToEnd) {
    try {
      await endPreorderForTrackGroup(
        trackGroup.id,
        trackGroup.makeTracksPreviewableOnRelease
      );
      logger.info(
        `endScheduledPreorders: ended pre-order for trackGroup ${trackGroup.id}`
      );
    } catch (e) {
      logger.error(
        `endScheduledPreorders: failed to end pre-order for trackGroup ${trackGroup.id}: ${e}`
      );
    }
  }
}
