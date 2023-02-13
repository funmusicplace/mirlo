import { PrismaClient, TrackGroup } from "@prisma/client";

const prisma = new PrismaClient();

export const doesTrackGroupBelongToUser = async (
  trackGroupId: number,
  userId: number
): Promise<TrackGroup | null> => {
  const artists = await prisma.artist.findMany({
    where: {
      userId: Number(userId),
    },
  });

  const trackgroup = await prisma.trackGroup.findFirst({
    where: {
      artistId: { in: artists.map((a) => a.id) },
      id: Number(trackGroupId),
    },
    include: {
      cover: true,
      tracks: true,
    },
  });
  return trackgroup;
};

export const doesTrackBelongToUser = async (
  trackId: number,
  userId: number
) => {
  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
    },
  });
  if (track) {
    const trackGroup = await doesTrackGroupBelongToUser(
      track?.trackGroupId,
      userId
    );
    if (trackGroup) {
      return track;
    }
    return null;
  }
  return null;
};
