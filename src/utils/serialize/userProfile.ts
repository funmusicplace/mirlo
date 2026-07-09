import { Prisma } from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import {
  finalProfileAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../minio";

export const USER_PROFILE_SELECT = {
  email: true,
  accountingEmail: true,
  id: true,
  name: true,
  artists: true,
  isAdmin: true,
  currency: true,
  language: true,
  wishlist: true,
  urlSlug: true,
  featureFlags: true,
  properties: true,
  isLabelAccount: true,
  combineSubscriptionEmails: true,
  canCreateArtists: true,
  trackFavorites: {
    include: {
      track: {
        include: {
          trackGroup: {
            include: {
              artist: true,
              cover: true,
            },
          },
        },
      },
    },
  },
  merchPurchase: true,
  userTrackGroupPurchases: {
    select: {
      trackGroupId: true,
    },
  },
  pledges: {
    where: {
      cancelledAt: null,
    },
    select: {
      amount: true,
      fundraiserId: true,
    },
  },
  userTrackPurchases: {
    select: {
      trackId: true,
    },
  },
  userAvatar: true,
  userBanner: true,
  artistUserSubscriptions: {
    where: {
      deletedAt: null,
    },
    select: {
      artistSubscriptionTier: {
        include: {
          artist: {
            include: {
              avatar: true,
              user: { select: { currency: true } },
            },
          },
        },
      },
      id: true,
      userId: true,
      amount: true,
      deleteReason: true,
      nextBillingDate: true,
      artistUserSubscriptionCharges: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          transaction: {
            select: {
              paymentStatus: true,
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.UserSelect;

export type UserProfilePayload = Prisma.UserGetPayload<{
  select: typeof USER_PROFILE_SELECT;
}>;

export function serializeUserProfile(user: UserProfilePayload) {
  return {
    ...user,
    userAvatar: addSizesToImage(finalUserAvatarBucket, user.userAvatar),
    userBanner: addSizesToImage(finalUserBannerBucket, user.userBanner),
    trackFavorites: user.trackFavorites.map((tf) => ({
      ...tf,
      track: {
        ...tf.track,
        trackGroup: {
          ...tf.track.trackGroup,
          cover: addSizesToImage(finalCoversBucket, tf.track.trackGroup.cover),
        },
      },
    })),
    artistUserSubscriptions: user.artistUserSubscriptions.map((aus) => ({
      ...aus,
      artistSubscriptionTier: {
        ...aus.artistSubscriptionTier,
        artist: {
          ...aus.artistSubscriptionTier.artist,
          avatar: addSizesToImage(
            finalProfileAvatarBucket,
            aus.artistSubscriptionTier.artist.avatar
          ),
        },
      },
    })),
  };
}
