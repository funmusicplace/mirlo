import prisma from "../../prisma/prisma";
import { finalAudioBucket, getObjectList, minioClient } from "../utils/minio";

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
    const objects = await getObjectList(finalAudioBucket, audio.id);

    await minioClient.removeObjects(
      finalAudioBucket,
      objects.map((o) => o.name)
    );
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
