import { addSizesToImage } from "../utils/artist";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
  finalUserBannerBucket,
} from "../utils/minio";
import { UserSelectPayload } from "../utils/user";

import { omitApPrivateKey, Serialized } from "./utils";
import { serializeProfileUserSubscription } from "./profileUserSubscription";

type TrackFavorite = UserSelectPayload["trackFavorites"][number];
type ProfileUserSubscription =
  UserSelectPayload["profileUserSubscriptions"][number];

/**
 * Serialize a user for outbound responses. Always remaps `profiles` →
 * `artists` when present; optional nested fields (avatar/banner, favorites,
 * subscriptions) are enriched when included on the payload.
 */
export const serializeUser = <T extends object>(user: T): Serialized<T> => {
  const {
    profiles,
    profileUserSubscriptions,
    trackFavorites,
    userAvatar,
    userBanner,
    ...rest
  } = user as T & {
    profiles?: object[];
    profileUserSubscriptions?: ProfileUserSubscription[];
    trackFavorites?: TrackFavorite[];
    userAvatar?: UserSelectPayload["userAvatar"];
    userBanner?: UserSelectPayload["userBanner"];
  };

  return {
    ...rest,
    ...(userAvatar !== undefined
      ? { userAvatar: addSizesToImage(finalUserAvatarBucket, userAvatar) }
      : {}),
    ...(userBanner !== undefined
      ? { userBanner: addSizesToImage(finalUserBannerBucket, userBanner) }
      : {}),
    ...(profiles !== undefined
      ? { artists: profiles.map(omitApPrivateKey) }
      : {}),
    ...(trackFavorites !== undefined
      ? {
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
        }
      : {}),
    ...(profileUserSubscriptions !== undefined
      ? {
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
        }
      : {}),
  } as Serialized<T>;
};
