import { TrackGroup, ArtistSubscriptionTier } from "@prisma/client";

import prisma from "../../prisma/prisma";

export const doesSubscriptionTierBelongToUser = async (
  subscriptionId: number,
  userId: number
): Promise<ArtistSubscriptionTier | null> => {
  const artists = await prisma.artist.findMany({
    where: {
      userId: Number(userId),
    },
  });

  const subscription = await prisma.artistSubscriptionTier.findFirst({
    where: {
      artistId: { in: artists.map((a) => a.id) },
      id: Number(subscriptionId),
    },
  });

  return subscription;
};

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
      tracks: {
        where: {
          deletedAt: null,
        },
      },
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
