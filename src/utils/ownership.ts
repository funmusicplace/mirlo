import {
  ArtistSubscriptionTier,
  Prisma,
  TrackGroup,
  User,
} from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { AppError } from "./error";
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
    include: {
      images: {
        include: { image: true },
      },
    },
  });

  return subscription;
};

export const doesTrackGroupBelongToUser = async (
  trackGroupId: number,
  user: User
) => {
  let trackGroup;
  if (user.isAdmin) {
    trackGroup = await prisma.trackGroup.findFirst({
      where: {
        id: Number(trackGroupId),
      },
      include: trackGroupSingleInclude({ loggedInUserId: user.id }),
    });
  } else {
    trackGroup = await prisma.trackGroup.findFirst({
      where: {
        OR: [
          {
            artist: {
              userId: user.id,
            },
          },
          {
            paymentToUserId: user.id,
          },
        ],
        id: Number(trackGroupId),
      },
      include: trackGroupSingleInclude({ loggedInUserId: user.id }),
    });
  }

  if (!trackGroup) {
    throw new AppError({
      description: "TrackGroup does not exist or does not belong to user",
      httpCode: 404,
      name: "TrackGroup does not exist or does not belong to user",
    });
  }
  return trackGroup;
};

export const doesMerchBelongToUser = async (merchId: string, user: User) => {
  let merch;
  if (user.isAdmin) {
    merch = await prisma.merch.findFirst({
      where: {
        id: merchId,
      },
    });
  } else {
    merch = await prisma.merch.findFirst({
      where: {
        artist: {
          userId: user.id,
        },
        id: merchId,
      },
    });
  }

  if (!merch) {
    throw new AppError({
      description: "Merch does not exist or does not belong to user",
      httpCode: 404,
      name: "Merch does not exist or does not belong to user",
    });
  }
  return merch;
};

export const doesMerchPurchaseBelongToUser = async (
  purchaseId: string,
  user: User
) => {
  let merch;
  if (user.isAdmin) {
    merch = await prisma.merchPurchase.findFirst({
      where: {
        id: purchaseId,
      },
    });
  } else {
    merch = await prisma.merchPurchase.findFirst({
      where: {
        merch: {
          artist: {
            userId: user.id,
          },
        },
        id: purchaseId,
      },
    });
  }

  if (!merch) {
    throw new AppError({
      description: "Merch purchase does not exist or does not belong to user",
      httpCode: 404,
      name: "Merch purchase does not exist or does not belong to user",
    });
  }
  return merch;
};

export const doesTrackBelongToUser = async (trackId: number, user: User) => {
  try {
    const track = await prisma.track.findUnique({
      where: {
        id: trackId,
      },
    });

    if (track) {
      const trackGroup = await doesTrackGroupBelongToUser(
        track?.trackGroupId,
        user
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

export const canUserListenToTrack = async (trackId?: number, user?: User) => {
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

  if (track && user) {
    const trackGroup = await doesTrackBelongToUser(track.trackGroupId, user);
    if (trackGroup) {
      return true;
    }

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        trackGroupId: track.trackGroupId,
        userId: user.id,
      },
    });

    if (purchase) {
      return true;
    }
  }
  return false;
};
