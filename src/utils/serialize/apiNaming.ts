import { Profile } from "@mirlo/prisma/client";

/**
 * Maps internal Prisma field names (profileId, artist relation, profileSubscriptionTier, …)
 * to the stable HTTP API contract (artistId, artist, artistSubscriptionTier, …).
 *
 * Note: the generated Prisma client uses relation fields named `profile` / `profiles`
 * while scalar FKs use `profileId`.
 */

export const stripApPrivateKey = <T extends { apPrivateKey?: string | null }>(
  profile: T
): Omit<T, "apPrivateKey"> => {
  const { apPrivateKey: _, ...rest } = profile;
  return rest;
};

/** Map a Profile row (or partial) to the public API artist shape (same fields, no rename on Profile itself). */
export const toApiArtist = <T extends Partial<Profile>>(profile: T): T => profile;

type WithProfileId = { profileId?: number | null };
type WithArtistRelation = { artist?: unknown | null; profile?: unknown | null };

/** Resolve nested artist/profile relation from either API or Prisma shape. */
export const getRelation = <T extends WithArtistRelation>(obj: T) =>
  obj.artist !== undefined ? obj.artist : obj.profile;

/** Rename profileId → artistId on objects that carry a foreign key to Profile. */
export const withArtistId = <T extends WithProfileId>(
  obj: T
): Omit<T, "profileId"> & { artistId?: number } => {
  const { profileId, ...rest } = obj;
  if (profileId === undefined || profileId === null) {
    return rest as Omit<T, "profileId"> & { artistId?: number };
  }
  return { ...rest, artistId: profileId };
};

/** Rename nested artist/profile relation → artist (shallow). */
export const withArtistRelation = <
  T extends WithArtistRelation & Record<string, unknown>,
>(
  obj: T
): Omit<T, "artist" | "profile"> & { artist?: unknown } => {
  const { artist, profile, ...rest } = obj;
  const relation = getRelation({ artist, profile });
  if (relation === undefined) {
    return rest as Omit<T, "artist" | "profile"> & { artist?: unknown };
  }
  return { ...rest, artist: relation };
};

/** profileId + optional artist relation → artistId + artist. */
export const withArtistFields = <
  T extends WithProfileId & WithArtistRelation & Record<string, unknown>,
>(
  obj: T
): Omit<T, "profileId" | "artist" | "profile"> & {
  artistId?: number;
  artist?: unknown;
} => {
  const { profileId, artist, profile, ...rest } = obj;
  const out: Record<string, unknown> = { ...rest };
  if (profileId !== undefined && profileId !== null) {
    out.artistId = profileId;
  }
  const relation = getRelation({ artist, profile });
  if (relation !== undefined) {
    out.artist = relation;
  }
  return out as Omit<T, "profileId" | "artist" | "profile"> & {
    artistId?: number;
    artist?: unknown;
  };
};

type InternalSubscriptionTier = {
  profileId?: number;
  artist?: unknown;
  profile?: unknown;
  [key: string]: unknown;
};

export const toApiSubscriptionTier = <T extends InternalSubscriptionTier>(
  tier: T
) => withArtistFields(tier);

type InternalUserSubscription = {
  profileSubscriptionTierId?: number;
  profileSubscriptionTier?: InternalSubscriptionTier & Record<string, unknown>;
  profileUserSubscriptionCharges?: unknown[];
  [key: string]: unknown;
};

export const toApiUserSubscription = <T extends InternalUserSubscription>(
  sub: T
) => {
  const {
    profileSubscriptionTierId,
    profileSubscriptionTier,
    profileUserSubscriptionCharges,
    ...rest
  } = sub;
  return {
    ...rest,
    ...(profileSubscriptionTierId !== undefined
      ? { artistSubscriptionTierId: profileSubscriptionTierId }
      : {}),
    ...(profileSubscriptionTier !== undefined
      ? {
          artistSubscriptionTier: toApiSubscriptionTier(profileSubscriptionTier),
        }
      : {}),
    ...(profileUserSubscriptionCharges !== undefined
      ? { artistUserSubscriptionCharges: profileUserSubscriptionCharges }
      : {}),
  };
};

type InternalSubscriptionCharge = {
  profileUserSubscription?: InternalUserSubscription;
  [key: string]: unknown;
};

export const toApiSubscriptionCharge = <T extends InternalSubscriptionCharge>(
  charge: T
) => {
  const { profileUserSubscription, ...rest } = charge;
  return {
    ...rest,
    ...(profileUserSubscription !== undefined
      ? { artistUserSubscription: toApiUserSubscription(profileUserSubscription) }
      : {}),
  };
};

/** Sales / transaction row: profileUserSubscriptionCharges → artistUserSubscriptionCharges */
export const toApiSaleResult = <
  T extends {
    profileUserSubscriptionCharges?: InternalSubscriptionCharge[];
    amount?: number;
    datePurchased?: string;
    userId?: number;
    artist?: unknown;
    [key: string]: unknown;
  },
>(
  result: T
): Omit<T, "profileUserSubscriptionCharges"> & {
  artistUserSubscriptionCharges?: ReturnType<typeof toApiSubscriptionCharge>[];
} => {
  const { profileUserSubscriptionCharges, ...rest } = result;
  return {
    ...rest,
    ...(profileUserSubscriptionCharges !== undefined
      ? {
          artistUserSubscriptionCharges: profileUserSubscriptionCharges.map(
            toApiSubscriptionCharge
          ),
        }
      : {}),
  };
};

type InternalArtistLabel = {
  artistId: number;
  artist?: unknown;
  profile?: unknown;
  [key: string]: unknown;
};

export const toApiArtistLabel = <T extends InternalArtistLabel>(label: T) =>
  withArtistRelation(label);

/**
 * ArtistLabel roster row with a fully serialized nested artist.
 * Applies API field renames on the join row; caller supplies enriched `artist`.
 */
export const toApiArtistLabelWithArtist = <
  T extends InternalArtistLabel & Record<string, unknown>,
>(
  row: T,
  artist: unknown,
  extra?: Record<string, unknown>
) => {
  const { artistId, profile: _profile, artist: _artist, ...rest } = row;
  return {
    ...toApiArtistLabel({ ...rest, artistId } as T),
    artist,
    ...extra,
  };
};

/** User row: artists → artists (API), profileUserSubscriptions → artistUserSubscriptions */
export const toApiUserFields = <
  T extends {
    artists?: unknown;
    profiles?: unknown;
    profileUserSubscriptions?: InternalUserSubscription[];
    [key: string]: unknown;
  },
>(
  user: T
) => {
  const { artists, profiles, profileUserSubscriptions, ...rest } = user;
  const ownedArtists = artists ?? profiles;
  return {
    ...rest,
    ...(ownedArtists !== undefined ? { artists: ownedArtists } : {}),
    ...(profileUserSubscriptions !== undefined
      ? {
          artistUserSubscriptions: profileUserSubscriptions.map(
            toApiUserSubscription
          ),
        }
      : {}),
  };
};

/** TrackGroup with nested artist → artistId + artist */
export const toApiTrackGroupFields = <
  T extends WithProfileId & WithArtistRelation & Record<string, unknown>,
>(
  obj: T
) => withArtistFields(obj);
