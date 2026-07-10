import { omitApPrivateKey, Serialized } from "./utils";

/**
 * Emit artist* wire shape for a tip / user profile tip row.
 */
export const serializeUserProfileTip = <T extends object>(
  tip: T
): Serialized<T> => {
  const { profileId, profile, profileTipTierId, ...rest } = tip as T & {
    profileId?: number | null;
    profile?: object | null;
    profileTipTierId?: number | null;
  };
  return {
    ...rest,
    artistId: profileId,
    ...(profile !== undefined
      ? {
          artist:
            profile && typeof profile === "object"
              ? omitApPrivateKey(profile)
              : profile,
        }
      : {}),
    artistTipTierId: profileTipTierId,
  } as Serialized<T>;
};
