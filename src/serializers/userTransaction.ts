import { serializeProfileUserSubscriptionCharge } from "./profileUserSubscription";
import { omitApPrivateKey, Serialized } from "./utils";

type NestedOwner = {
  profileId?: number;
  profile?: object | null;
  artistId?: number;
  artist?: object | null;
};

/**
 * Remap nested purchase/tip relations on a user transaction to artist* wire shape.
 *
 * Accepts either raw Prisma rows (profile on nested objects) or already-serialized
 * trackGroups/merch (artist already present). Prefer composing processSingleTrackGroup /
 * serializeMerch at the call site before calling this when enrichment is needed.
 *
 * When `emailShape: true`, nested `artistId` scalars are omitted at runtime (templates
 * only read `artist`); the return type is still {@link Serialized}`.
 */
export const serializeUserTransaction = <T extends object>(
  transaction: T,
  options?: {
    /** When true, only set `artist` (no artistId) for email templates. */
    emailShape?: boolean;
    artistIdFromProfileId?: boolean;
  }
): Serialized<T> => {
  const emailShape = options?.emailShape === true;
  const {
    trackGroupPurchases,
    trackPurchases,
    merchPurchases,
    tips,
    profileUserSubscriptionCharges,
    ...rest
  } = transaction as T & {
    trackGroupPurchases?: { trackGroup?: NestedOwner | null }[];
    trackPurchases?: {
      track?: { trackGroup?: NestedOwner | null } | null;
    }[];
    merchPurchases?: {
      merch?:
        | (NestedOwner & {
            includePurchaseTrackGroup?: NestedOwner | null;
          })
        | null;
    }[];
    tips?: (NestedOwner & { profileTipTierId?: number | null })[];
    profileUserSubscriptionCharges?: object[];
  };

  const remapNestedOwner = (obj: NestedOwner) => {
    const {
      profileId,
      profile,
      artistId: existingArtistId,
      artist: existingArtist,
      ...objRest
    } = obj;
    const rawOwner = existingArtist ?? profile;
    const owner =
      rawOwner && typeof rawOwner === "object"
        ? omitApPrivateKey(rawOwner)
        : rawOwner;
    const artistId =
      existingArtistId ?? profileId ?? (profile as { id?: number } | null)?.id;
    if (emailShape) {
      return { ...objRest, artist: owner };
    }
    return { ...objRest, artistId, artist: owner };
  };

  return {
    ...rest,
    ...(trackGroupPurchases !== undefined
      ? {
          trackGroupPurchases: trackGroupPurchases.map((p) => ({
            ...p,
            trackGroup: p.trackGroup
              ? remapNestedOwner(p.trackGroup)
              : p.trackGroup,
          })),
        }
      : {}),
    ...(trackPurchases !== undefined
      ? {
          trackPurchases: trackPurchases.map((p) => ({
            ...p,
            track: p.track
              ? {
                  ...p.track,
                  trackGroup: p.track.trackGroup
                    ? remapNestedOwner(p.track.trackGroup)
                    : p.track.trackGroup,
                }
              : p.track,
          })),
        }
      : {}),
    ...(merchPurchases !== undefined
      ? {
          merchPurchases: merchPurchases.map((p) => {
            if (!p.merch) return p;
            const { includePurchaseTrackGroup, ...merchFields } = p.merch;
            const remapped = remapNestedOwner(merchFields);
            if (!includePurchaseTrackGroup) {
              return { ...p, merch: remapped };
            }
            const {
              profileId: iPid,
              profile: iProf,
              artistId: existingIncludeArtistId,
              artist: existingIncludeArtist,
              ...iRest
            } = includePurchaseTrackGroup;
            const rawIncludeOwner = existingIncludeArtist ?? iProf;
            const includeOwner =
              rawIncludeOwner && typeof rawIncludeOwner === "object"
                ? omitApPrivateKey(rawIncludeOwner)
                : rawIncludeOwner;
            const includeArtistId = existingIncludeArtistId ?? iPid;
            return {
              ...p,
              merch: {
                ...remapped,
                includePurchaseTrackGroup: emailShape
                  ? { ...iRest, artist: includeOwner }
                  : {
                      ...iRest,
                      artistId: includeArtistId,
                      artist: includeOwner,
                    },
              },
            };
          }),
        }
      : {}),
    ...(tips !== undefined
      ? {
          tips: tips.map((tip) => {
            const { profileTipTierId, ...tipWithoutTier } = tip;
            const remapped = remapNestedOwner(tipWithoutTier);
            if (emailShape) return remapped;
            return {
              ...remapped,
              ...(profileTipTierId !== undefined
                ? { artistTipTierId: profileTipTierId }
                : {}),
            };
          }),
        }
      : {}),
    ...(profileUserSubscriptionCharges !== undefined
      ? {
          artistUserSubscriptionCharges: profileUserSubscriptionCharges.map(
            (charge) => serializeProfileUserSubscriptionCharge(charge)
          ),
        }
      : {}),
  } as Serialized<T>;
};
