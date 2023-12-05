import { Prisma } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { deleteTrackGroup } from "../utils/trackGroup";
import logger from "../logger";
import { deleteTrack } from "../utils/tracks";

const cleanUpTrackGroups = async () => {
  logger.info(`cleanUpTrackGroups script started`);

  const today = new Date();
  const sixMonthsAgo = today.setMonth(today.getMonth() - 6);
  const deletedTrackGroups = await prisma.trackGroup.findMany({
    where: {
      deletedAt: { lte: new Date(sixMonthsAgo) },
    },
  });

  await Promise.all(
    deletedTrackGroups.map((tg) => deleteTrackGroup(tg.id, true))
  );

  const ids = deletedTrackGroups.map((tg) => tg.id);

  logger.info(`Cleaning up ${ids.length} trackGroups: ${ids.join(", ")}`);
  if (ids.length) {
    await prisma.$executeRaw`DELETE FROM "TrackGroupCover" where "trackGroupId" IN (${Prisma.join(
      ids
    )})`;
    await prisma.$executeRaw`DELETE FROM "UserTrackGroupWishlist" where "trackGroupId" IN (${Prisma.join(
      ids
    )})`;

    const tracks = await prisma.track.findMany({
      where: {
        trackGroupId: { in: ids },
        deletedAt: {
          not: null,
        },
      },
    });
    const trackIds = tracks.map((t) => t.id);
    logger.info(
      `Cleaning up ${trackIds.length} tracks: ${trackIds.join(", ")}`
    );

    await Promise.all(tracks.map(async (track) => await deleteTrack(track.id)));
    if (trackIds.length) {
      await prisma.$executeRaw`DELETE FROM "TrackAudio" where "trackId" IN (${Prisma.join(
        trackIds
      )})`;
      await prisma.$executeRaw`DELETE FROM "TrackPlay" where "trackId" IN (${Prisma.join(
        trackIds
      )})`;
      await prisma.$executeRaw`DELETE FROM "TrackArtist" where "trackId" IN (${Prisma.join(
        trackIds
      )})`;
      await prisma.$executeRaw`DELETE FROM "Track" where "id" IN (${Prisma.join(
        trackIds
      )})`;
    }
  }
};

export default cleanUpTrackGroups;
