import prisma from "../../prisma/prisma";
import { finalAudioBucket, removeObjectsFromBucket } from "../utils/minio";

export const deleteTrack = async (trackId: number) => {
  await prisma.track.delete({
    where: {
      id: trackId,
    },
  });

  const audio = await prisma.trackAudio.findFirst({
    where: {
      trackId: trackId,
    },
  });
  if (audio) {
    await removeObjectsFromBucket(finalAudioBucket, audio.id);

    await prisma.trackAudio.delete({
      where: {
        trackId: trackId,
      },
    });
  }

  await prisma.trackArtist.deleteMany({
    where: {
      trackId: trackId,
    },
  });
};
