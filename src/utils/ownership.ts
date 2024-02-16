import { ArtistSubscriptionTier, Prisma } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "./error";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { trackGroupSingleInclude } from "./trackGroup";

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
) => {
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
    include: trackGroupSingleInclude({ loggedInUserId: userId }),
  });

  if (!trackgroup) {
    throw new AppError({
      description: "TrackGroup does not exist or does not belong to user",
      httpCode: 404,
      name: "TrackGroup does not exist or does not belong to user",
    });
  }
  return trackgroup;
};

export const doesTrackBelongToUser = async (
  trackId: number,
  userId: number
) => {
  try {
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
  } catch (e) {
    return null;
  }
};

export const canUserListenToTrack = async (
  trackId?: number,
  userId?: number
) => {
  if (!trackId) {
    return false;
  }

  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
    },
  });

  if (track?.isPreview) {
    return true;
  }

  if (track && userId) {
    const trackGroup = await doesTrackBelongToUser(track.trackGroupId, userId);
    if (trackGroup) {
      return true;
    }

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        trackGroupId: track.trackGroupId,
        userId: userId,
      },
    });

    if (purchase) {
      return true;
    }
  }
  return false;
};
