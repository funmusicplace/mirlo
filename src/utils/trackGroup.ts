import { TrackGroup, Track, TrackGroupCover } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { convertURLArrayToSizes, generateFullStaticImageUrl } from "./images";
import { finalCoversBucket } from "./minio";

/**
 * We use our own custom function to handle this until we
 * can figure out a way to soft delete cascade. Maybe
 * we can't?
 *
 * @param trackGroupId
 */
export const deleteTrackGroup = async (trackGroupId: number) => {
  await prisma.trackGroup.delete({
    where: {
      id: Number(trackGroupId),
    },
  });

  const tracks = await prisma.track.findMany({
    where: {
      trackGroupId,
    },
  });

  await prisma.track.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.track.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.trackGroupCover.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.trackAudio.deleteMany({
    where: {
      trackId: { in: tracks.map((t) => t.id) },
    },
  });
};

export default {
  cover: generateFullStaticImageUrl,
  single: (
    tg: TrackGroup & {
      cover: TrackGroupCover | null;
      tracks?: Track[];
    }
  ) => ({
    ...tg,
    cover: {
      ...tg.cover,
      sizes: tg.cover
        ? convertURLArrayToSizes(tg.cover?.url, finalCoversBucket)
        : undefined,
    },
  }),
};
