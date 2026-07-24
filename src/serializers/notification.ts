import { addSizesToImage } from "../utils/artist";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalPostImageBucket,
} from "../utils/minio";

import {
  omitApPrivateKey,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";

type PurchaseLookup = Map<string, unknown>;

/**
 * Emit artist* wire shape for a notification row (with nested relations).
 */
export const serializeNotification = <T extends object>(
  n: T,
  purchaseMap?: PurchaseLookup
): Serialized<T> => {
  const {
    profileId,
    profile,
    subscription,
    post,
    trackGroup,
    relatedUser,
    relatedUserId,
    trackGroupId,
    ...rest
  } = n as T & {
    profileId?: number | null;
    profile?: object | null;
    relatedUserId?: number | null;
    trackGroupId?: number | null;
    subscription?: {
      profileSubscriptionTierId?: number;
      profileSubscriptionTier?: {
        profileId?: number;
        profile?: object | null;
      } | null;
    } | null;
    post?: {
      profileId?: number | null;
      profile?: {
        avatar?: { url: string[]; profileId?: number } | null;
      } | null;
      featuredImage?: {
        id: string;
        extension: string;
      } | null;
    } | null;
    trackGroup?: {
      profileId?: number | null;
      profile?: {
        user?: { currency?: string | null } | null;
      } | null;
      cover?: { url: string[] } | null;
    } | null;
    relatedUser?: {
      profiles?: {
        avatar?: { url: string[]; profileId?: number } | null;
      }[];
    } | null;
  };

  const {
    profileSubscriptionTierId,
    profileSubscriptionTier,
    ...subscriptionRest
  } = subscription ?? {};

  const remapAvatar = (
    avatar: { url: string[]; profileId?: number } | null | undefined
  ) =>
    renameProfileIdToArtistId(addSizesToImage(finalArtistAvatarBucket, avatar));

  return {
    ...rest,
    artistId: profileId ?? undefined,
    artist:
      profile && typeof profile === "object"
        ? omitApPrivateKey(profile)
        : profile,
    subscription: subscription
      ? {
          ...subscriptionRest,
          artistSubscriptionTierId: profileSubscriptionTierId,
          artistSubscriptionTier: profileSubscriptionTier
            ? (() => {
                const {
                  profileId: tierProfileId,
                  profile: tierProfile,
                  ...tierRest
                } = profileSubscriptionTier;
                return {
                  ...tierRest,
                  artistId: tierProfileId,
                  artist:
                    tierProfile && typeof tierProfile === "object"
                      ? omitApPrivateKey(tierProfile)
                      : tierProfile,
                };
              })()
            : null,
        }
      : null,
    trackGroup: trackGroup
      ? (() => {
          const {
            profileId: tgProfileId,
            profile: tgProfile,
            ...tgRest
          } = trackGroup;
          return {
            ...tgRest,
            artistId: tgProfileId,
            artist: tgProfile ? omitApPrivateKey(tgProfile) : tgProfile,
            currency: tgProfile?.user?.currency ?? "usd",
            cover: addSizesToImage(finalCoversBucket, trackGroup.cover),
            purchase:
              relatedUserId && purchaseMap
                ? (purchaseMap.get(`${relatedUserId}_${trackGroupId}`) ?? null)
                : null,
          };
        })()
      : null,
    post: post
      ? (() => {
          const {
            profileId: postProfileId,
            profile: postProfile,
            ...postRest
          } = post;
          return {
            ...postRest,
            artistId: postProfileId,
            artist: postProfile
              ? (() => {
                  const { avatar, ...profileRest } = postProfile;
                  return {
                    ...omitApPrivateKey(profileRest),
                    avatar: remapAvatar(avatar),
                  };
                })()
              : null,
            featuredImage: post.featuredImage
              ? {
                  ...post.featuredImage,
                  src: generateFullStaticImageUrl(
                    post.featuredImage.id,
                    finalPostImageBucket,
                    post.featuredImage.extension
                  ),
                }
              : null,
          };
        })()
      : null,
    relatedUser: relatedUser
      ? (() => {
          const { profiles, ...relatedRest } = relatedUser;
          return {
            ...relatedRest,
            artists: (profiles ?? []).map((profile) => {
              const { avatar, ...profileRest } = profile;
              return {
                ...omitApPrivateKey(profileRest),
                avatar: remapAvatar(avatar),
              };
            }),
          };
        })()
      : null,
  } as Serialized<T>;
};
