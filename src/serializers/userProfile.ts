import { Prisma } from "@mirlo/prisma/client";

import { addSizesToImage } from "../utils/artist";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../utils/minio";

import { omitApPrivateKey, Serialized } from "./utils";
import { serializeProfileUserSubscription } from "./profileUserSubscription";

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

export function serializeUserProfile(
  user: UserProfilePayload
): Serialized<UserProfilePayload> {
  const { profiles, profileUserSubscriptions, trackFavorites, ...userRest } =
    user;

  return {
    ...userRest,
    userAvatar: addSizesToImage(finalUserAvatarBucket, user.userAvatar),
    userBanner: addSizesToImage(finalUserBannerBucket, user.userBanner),
    artists: profiles.map(omitApPrivateKey),
    trackFavorites: trackFavorites.map((tf) => {
      const { profileId, profile, ...tgRest } = tf.track.trackGroup;
      return {
        ...tf,
        track: {
          ...tf.track,
          trackGroup: {
            ...tgRest,
            artistId: profileId,
            artist: profile ? omitApPrivateKey(profile) : profile,
            cover: addSizesToImage(
              finalCoversBucket,
              tf.track.trackGroup.cover
            ),
          },
        },
      };
    }),
    artistUserSubscriptions: profileUserSubscriptions.map((aus) => {
      const remapped = serializeProfileUserSubscription(aus);
      return {
        ...remapped,
        artistSubscriptionTier: {
          ...remapped.artistSubscriptionTier,
          artist: {
            ...remapped.artistSubscriptionTier.artist,
            avatar: addSizesToImage(
              finalArtistAvatarBucket,
              remapped.artistSubscriptionTier.artist.avatar
            ),
          },
        },
      };
    }),
  } as unknown as Serialized<UserProfilePayload>;
}
