import prisma from "@mirlo/prisma";

import logger from "../logger";

import { removeZips } from "./minio";

export const clearTrackGroupDownloads = async (trackGroupId: number) => {
  try {
    const tracks = await prisma.track.findMany({
      where: { trackGroupId },
      select: { id: true },
    });

    await Promise.all([
      removeZips("trackGroup", trackGroupId),
      ...tracks.map((track) => removeZips("track", track.id)),
    ]);
    logger.info(`trackGroupId ${trackGroupId}: cleared cached download zips`);
  } catch (e) {
    logger.error(
      `trackGroupId ${trackGroupId}: failed to clear cached download zips`
    );
    console.error(e);
  }
};

export const clearTrackDownloads = async (trackId: number) => {
  try {
    const track = await prisma.track.findFirst({
      where: { id: trackId },
      select: { trackGroupId: true },
    });

    await Promise.all([
      removeZips("track", trackId),
      track ? removeZips("trackGroup", track.trackGroupId) : undefined,
    ]);
    logger.info(`trackId ${trackId}: cleared cached download zips`);
  } catch (e) {
    logger.error(`trackId ${trackId}: failed to clear cached download zips`);
    console.error(e);
  }
};
