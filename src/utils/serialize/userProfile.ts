import { Prisma } from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../minio";

export const USER_PROFILE_SELECT = {
  email: true,
  accountingEmail: true,
  id: true,
  name: true,
  profiles: true,
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
              profile: true,
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
  profileUserSubscriptions: {
    where: {
      deletedAt: null,
    },
    select: {
      profileSubscriptionTier: {
        include: {
          profile: {
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
      profileSubscriptionTierId: true,
      profileUserSubscriptionCharges: {
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
  const { profiles, profileUserSubscriptions, ...userRest } = user;

  return {
    ...userRest,
    // API contract: owned profiles are exposed as `artists`
    artists: profiles,
    userAvatar: addSizesToImage(finalUserAvatarBucket, user.userAvatar),
    userBanner: addSizesToImage(finalUserBannerBucket, user.userBanner),
    trackFavorites: user.trackFavorites.map((tf) => {
      const { profileId, profile, ...trackGroupRest } = tf.track.trackGroup;
      return {
        ...tf,
        track: {
          ...tf.track,
          trackGroup: {
            ...trackGroupRest,
            artistId: profileId,
            artist: profile,
            cover: addSizesToImage(
              finalCoversBucket,
              tf.track.trackGroup.cover
            ),
          },
        },
      };
    }),
    artistUserSubscriptions: profileUserSubscriptions.map((aus) => {
      const {
        profileSubscriptionTierId,
        profileSubscriptionTier,
        profileUserSubscriptionCharges,
        ...subRest
      } = aus;
      const { profileId, profile, ...tierRest } =
        profileSubscriptionTier ?? ({} as typeof profileSubscriptionTier & {});
      return {
        ...subRest,
        artistSubscriptionTierId: profileSubscriptionTierId,
        artistSubscriptionTier: profileSubscriptionTier
          ? {
              ...tierRest,
              artistId: profileId,
              artist: profile
                ? {
                    ...profile,
                    avatar: addSizesToImage(
                      finalArtistAvatarBucket,
                      profile.avatar
                    ),
                  }
                : profile,
            }
          : profileSubscriptionTier,
        artistUserSubscriptionCharges: profileUserSubscriptionCharges,
      };
    }),
  };
}
