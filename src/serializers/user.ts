import { addSizesToStoredImage } from "../utils/artist";
import { UserSelectPayload } from "../utils/user";

import { serializeProfileUserSubscription } from "./profileUserSubscription";
import { omitApPrivateKey, Serialized } from "./utils";

type TrackFavorite = UserSelectPayload["trackFavorites"][number];
type ProfileUserSubscription =
  UserSelectPayload["profileUserSubscriptions"][number];

/**
 * Serialize a user for outbound responses. Always remaps `profiles` →
 * `artists` when present; optional nested fields (favorites, subscriptions)
 * are enriched when included on the payload.
 */
export const serializeUser = <T extends object>(user: T): Serialized<T> => {
  const { profiles, profileUserSubscriptions, trackFavorites, ...rest } =
    user as T & {
      profiles?: object[];
      profileUserSubscriptions?: ProfileUserSubscription[];
      trackFavorites?: TrackFavorite[];
    };

  return {
    ...rest,
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
                  cover: addSizesToStoredImage(tf.track.trackGroup.cover),
                },
              },
            };
          }),
        }
      : {}),
    ...(profileUserSubscriptions !== undefined
      ? {
          artistUserSubscriptions: profileUserSubscriptions.map(
            ({ stripeSubscriptionKey, ...aus }) => {
              const remapped = serializeProfileUserSubscription(aus);
              return {
                ...remapped,
                isPaid: !!stripeSubscriptionKey,
                artistSubscriptionTier: {
                  ...remapped.artistSubscriptionTier,
                  artist: {
                    ...remapped.artistSubscriptionTier.artist,
                    avatar: addSizesToStoredImage(
                      remapped.artistSubscriptionTier.artist.avatar
                    ),
                  },
                },
              };
            }
          ),
        }
      : {}),
  } as Serialized<T>;
};
