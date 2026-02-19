import {
  ArtistSubscriptionTier,
  Prisma,
  TrackGroup,
  User,
} from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { AppError } from "./error";

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
      include: {
        cover: {
          where: {
            deletedAt: null,
          },
        },
      },
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
      include: {
        cover: {
          where: {
            deletedAt: null,
          },
        },
      },
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
      select: {
        trackGroupId: true,
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

export const canUserListenToTrack = async (
  trackId?: number,
  user?: User,
  ip?: string
) => {
  if (!trackId) {
    return false;
  }

  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
    },
    select: {
      id: true,
      isPreview: true,
      trackGroupId: true,
      trackGroup: {
        select: {
          artist: {
            select: {
              maxFreePlays: true,
            },
          },
        },
      },
    },
  });

  if (!track) {
    return false;
  }

  if (user) {
    const purchaseTrackGroup = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        trackGroupId: track.trackGroupId,
        userId: user.id,
      },
    });
    const purchaseTrack = await prisma.userTrackPurchase.findFirst({
      where: {
        trackId: track.id,
        userId: user.id,
      },
    });
    if (purchaseTrackGroup || purchaseTrack) {
      return true;
    }

    const trackGroup = await doesTrackBelongToUser(track.id, user);
    if (trackGroup) {
      return true;
    }
  }

  if (track?.isPreview) {
    if (user) {
      const maxFreePlays = track.trackGroup?.artist?.maxFreePlays;
      if (!!maxFreePlays) {
        const userPlays = await prisma.trackPlay.count({
          where: {
            userId: user.id,
            trackId: track.id,
          },
        });
        if (userPlays >= maxFreePlays) {
          return "exceeded";
        }
      }
    } else if (ip) {
      const maxFreePlays = track.trackGroup?.artist?.maxFreePlays;
      if (!!maxFreePlays) {
        const ipPlays = await prisma.trackPlay.count({
          where: {
            ip,
            trackId: track.id,
          },
        });
        if (ipPlays >= maxFreePlays) {
          return "exceeded";
        }
      }
    }

    return true;
  }

  return false;
};
