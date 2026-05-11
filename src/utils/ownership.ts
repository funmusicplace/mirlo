import { ArtistSubscriptionTier, User } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { AppError } from "./error";

export const doesSubscriptionTierBelongToUser = async (
  subscriptionId: number,
  userId: number
): Promise<ArtistSubscriptionTier | null> => {
  const artists = await prisma.artist.findMany({
    where: {
      userId,
    },
  });

  const subscription = await prisma.artistSubscriptionTier.findFirst({
    where: {
      artistId: { in: artists.map((a) => a.id) },
      id: subscriptionId,
    },
    include: {
      images: {
        include: { image: true },
      },
      releases: {
        select: {
          trackGroupId: true,
        },
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

/**
 * How many free plays remain for `user` (or `ip`, when anonymous) on a given
 * track. Returns `null` for cases where the limit doesn't apply: the track
 * isn't a preview, the artist hasn't set `maxFreePlays`, the user owns the
 * track/album, or the user is the artist. Otherwise returns
 * `{ remaining, max, exceeded }` so the client can surface a soft warning
 * before the listener actually hits the limit (#1760).
 */
export const getPlayLimitContext = async (
  trackId: number,
  user?: { id: number },
  ip?: string
): Promise<{
  remaining: number;
  max: number;
  exceeded: boolean;
} | null> => {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      isPreview: true,
      trackGroupId: true,
      trackGroup: {
        select: {
          artist: { select: { maxFreePlays: true, userId: true } },
        },
      },
    },
  });
  if (!track || !track.isPreview) return null;

  const max = track.trackGroup?.artist?.maxFreePlays ?? 0;
  if (!max) return null;

  if (user) {
    if (track.trackGroup?.artist?.userId === user.id) return null;
    const owns = await prisma.userTrackGroupPurchase.findFirst({
      where: { trackGroupId: track.trackGroupId, userId: user.id },
      select: { userId: true },
    });
    if (owns) return null;
    const ownsTrack = await prisma.userTrackPurchase.findFirst({
      where: { trackId: track.id, userId: user.id },
      select: { userId: true },
    });
    if (ownsTrack) return null;
  }

  let count = 0;
  if (user) {
    count = await prisma.trackPlay.count({
      where: { userId: user.id, trackId: track.id },
    });
  } else if (ip) {
    count = await prisma.trackPlay.count({
      where: { ip, trackId: track.id },
    });
  } else {
    return null;
  }

  const remaining = Math.max(0, max - count);
  return { remaining, max, exceeded: count >= max };
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
