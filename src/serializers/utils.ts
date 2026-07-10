export const omitApPrivateKey = <T extends object>(
  profile: T
): Omit<T, "apPrivateKey"> => {
  const { apPrivateKey: _, ...publicProfile } = profile as T & {
    apPrivateKey?: unknown;
  };
  return publicProfile;
};

export const renameProfileIdToArtistId = <T extends object>(
  value: T | null | undefined
): (Omit<T, "profileId"> & { artistId?: number }) | null | undefined => {
  if (!value) return value;
  const { profileId, ...rest } = value as T & { profileId?: number };
  return {
    ...rest,
    ...(profileId !== undefined ? { artistId: profileId } : {}),
  } as Omit<T, "profileId"> & { artistId?: number };
};

/** Prisma / wire keys that serializers rename to artist* on the way out. */
type ArtistKeyMap = {
  profile: "artist";
  profileId: "artistId";
  profiles: "artists";
  profileSubscriptionTier: "artistSubscriptionTier";
  profileSubscriptionTierId: "artistSubscriptionTierId";
  profileUserSubscription: "artistUserSubscription";
  profileUserSubscriptions: "artistUserSubscriptions";
  profileUserSubscriptionId: "artistUserSubscriptionId";
  profileUserSubscriptionCharges: "artistUserSubscriptionCharges";
  profileTipTier: "artistTipTier";
  profileTipTierId: "artistTipTierId";
};

type Builtin =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | ((...args: never[]) => unknown);

/**
 * Deep remap of Prisma `profile*` ownership keys to outbound `artist*` keys,
 * stripping `apPrivateKey` wherever it appears. Preserves all other field types.
 */
export type Serialized<T> = T extends Builtin
  ? T
  : T extends readonly (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? {
          [K in keyof T as K extends keyof ArtistKeyMap
            ? ArtistKeyMap[K]
            : K extends "apPrivateKey"
              ? never
              : K]: Serialized<T[K]>;
        }
      : T;
