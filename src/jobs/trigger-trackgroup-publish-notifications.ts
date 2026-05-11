import prisma from "@mirlo/prisma";

import logger from "../logger";
import { finalizeTrackGroupPublication } from "../utils/trackGroup";

export async function triggerTrackGroupPublishNotifications() {
  const now = new Date();

  const trackGroupsToFinalize = await prisma.trackGroup.findMany({
    where: {
      publishedAt: { lte: now, not: null },
      isPublic: true,
      isHiddenTrackGroupForSongDrafts: false,
      notifiedFollowersAt: null,
      deletedAt: null,
      adminEnabled: true,
      artist: {
        enabled: true,
        deletedAt: null,
      },
    },
  });

  logger.info(
    `triggerTrackGroupPublishNotifications: found ${trackGroupsToFinalize.length} trackGroups to finalize`
  );

  for (const trackGroup of trackGroupsToFinalize) {
    try {
      if (!trackGroup.publishedAt) continue;
      await finalizeTrackGroupPublication(trackGroup, trackGroup.publishedAt);
      logger.info(
        `triggerTrackGroupPublishNotifications: finalized trackGroup ${trackGroup.id}`
      );
    } catch (e) {
      logger.error(
        `triggerTrackGroupPublishNotifications: failed to finalize trackGroup ${trackGroup.id}: ${e}`
      );
    }
  }
}
