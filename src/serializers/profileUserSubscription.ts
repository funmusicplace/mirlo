import {
  omitApPrivateKey,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";

/**
 * Emit artist* wire shape for a profile user subscription (+ nested charges/tier).
 */
export const serializeProfileUserSubscription = <T extends object>(
  sub: T,
  options?: { includeTierArtist?: boolean }
): Serialized<T> => {
  const {
    profileSubscriptionTierId,
    profileSubscriptionTier,
    profileUserSubscriptionCharges,
    ...subRest
  } = sub as T & {
    profileSubscriptionTierId?: number;
    profileSubscriptionTier?: {
      profileId?: number;
      profile?: object | null;
    } | null;
    profileUserSubscriptionCharges?: {
      profileUserSubscriptionId?: number;
    }[];
  };

  const includeTierArtist = options?.includeTierArtist !== false;

  let artistSubscriptionTier: object | null | undefined;
  if (profileSubscriptionTier) {
    const { profileId, profile, ...tierRest } = profileSubscriptionTier;
    artistSubscriptionTier = {
      ...tierRest,
      artistId: profileId,
      ...(includeTierArtist
        ? {
            artist:
              profile && typeof profile === "object"
                ? (() => {
                    const publicProfile = omitApPrivateKey(profile) as {
                      avatar?: object | null;
                      background?: object | null;
                    };
                    const { avatar, background, ...rest } = publicProfile;
                    return {
                      ...rest,
                      ...(avatar !== undefined
                        ? { avatar: renameProfileIdToArtistId(avatar) }
                        : {}),
                      ...(background !== undefined
                        ? { background: renameProfileIdToArtistId(background) }
                        : {}),
                    };
                  })()
                : profile,
          }
        : {}),
    };
  } else if (profileSubscriptionTier === null) {
    artistSubscriptionTier = null;
  }

  return {
    ...subRest,
    artistSubscriptionTierId: profileSubscriptionTierId,
    ...(artistSubscriptionTier !== undefined ? { artistSubscriptionTier } : {}),
    ...(profileUserSubscriptionCharges !== undefined
      ? {
          artistUserSubscriptionCharges: profileUserSubscriptionCharges.map(
            (charge) => {
              const { profileUserSubscriptionId, ...chargeRest } = charge;
              return {
                ...chargeRest,
                artistUserSubscriptionId: profileUserSubscriptionId,
              };
            }
          ),
        }
      : {}),
  } as Serialized<T>;
};

export const serializeProfileUserSubscriptionCharge = <T extends object>(
  charge: T
): Serialized<T> => {
  const { profileUserSubscriptionId, profileUserSubscription, ...chargeRest } =
    charge as T & {
      profileUserSubscriptionId?: number;
      profileUserSubscription?: object | null;
    };

  return {
    ...chargeRest,
    artistUserSubscriptionId: profileUserSubscriptionId,
    artistUserSubscription: profileUserSubscription
      ? serializeProfileUserSubscription(profileUserSubscription)
      : profileUserSubscription,
  } as Serialized<T>;
};
