import { Prisma } from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import {
  finalProfileAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../minio";

import {
  toApiSubscriptionTier,
  toApiUserFields,
  toApiUserSubscription,
  withArtistFields,
} from "./apiNaming";

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
    ...toApiUserFields({ ...userRest, profiles }),
    userAvatar: addSizesToImage(finalUserAvatarBucket, user.userAvatar),
    userBanner: addSizesToImage(finalUserBannerBucket, user.userBanner),
    trackFavorites: user.trackFavorites.map((tf) => {
      const { profileId, profile, ...trackGroupRest } = tf.track.trackGroup;
      return {
        ...tf,
        track: {
          ...tf.track,
          trackGroup: {
            ...withArtistFields({
              ...trackGroupRest,
              profileId,
              profile,
            }),
            cover: addSizesToImage(
              finalCoversBucket,
              tf.track.trackGroup.cover
            ),
          },
        },
      };
    }),
    artistUserSubscriptions: profileUserSubscriptions.map((aus) => {
      const tier = aus.profileSubscriptionTier;
      const tierWithAvatar = tier?.profile
        ? {
            ...tier,
            profile: {
              ...tier.profile,
              avatar: addSizesToImage(
                finalProfileAvatarBucket,
                tier.profile.avatar
              ),
            },
          }
        : tier;

      return toApiUserSubscription({
        ...aus,
        profileSubscriptionTier: tierWithAvatar
          ? toApiSubscriptionTier(tierWithAvatar)
          : tierWithAvatar,
      });
    }),
  };
}
