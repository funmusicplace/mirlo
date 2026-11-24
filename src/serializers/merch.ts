import { Merch } from "@mirlo/prisma/client";

import { addSizesToStoredImage } from "../utils/artist";
import { MerchImageWithImage } from "../utils/merch";
import {
  ReleaseArtistRow,
  releaseArtistsWhenLoaded,
  resolveTrackArtists,
  TrackArtistRow,
  serializeTrackGroupArtists,
} from "../utils/releaseArtists";

import { omitPrivateProfileFields, Serialized } from "./utils";

export const serializeMerchImage = (merchImage: MerchImageWithImage) => {
  return {
    ...addSizesToStoredImage(merchImage.image),
    id: merchImage.id,
    merchId: merchImage.merchId,
    imageId: merchImage.imageId,
    position: merchImage.position,
  };
};

export const serializeMerch = <T extends object>(
  merch: T,
  options?: { fallbackCurrency?: string }
): Serialized<T> & { currency: string } => {
  const { profileId, profile, includePurchaseTrackGroup, ...rest } =
    merch as T &
      Merch & { images?: MerchImageWithImage[] } & {
        profileId?: number;
        profile?: {
          user?: { currency?: string | null } | null;
        } | null;
        includePurchaseTrackGroup?: {
          profileId?: number;
          profile?: {
            id?: number;
            name?: string | null;
            urlSlug?: string | null;
          } | null;
          trackGroupArtists?: ReleaseArtistRow[];
          tracks?: { trackArtists?: TrackArtistRow[] }[];
        } | null;
        downloadableContent?: {
          downloadableContent: object;
          downloadableContentId: string;
        }[];
      };

  const tgInclude = includePurchaseTrackGroup
    ? (() => {
        const {
          profileId: iPid,
          profile: iProf,
          ...iRest
        } = includePurchaseTrackGroup;
        const releaseArtists = releaseArtistsWhenLoaded(
          includePurchaseTrackGroup,
          iProf
        );
        return {
          ...iRest,
          ...releaseArtists,
          trackGroupArtists: serializeTrackGroupArtists(
            includePurchaseTrackGroup.trackGroupArtists
          ),
          tracks: includePurchaseTrackGroup.tracks?.map((track) => ({
            ...track,
            ...(track.trackArtists && releaseArtists.releaseArtists
              ? resolveTrackArtists(
                  track.trackArtists,
                  releaseArtists.releaseArtists
                )
              : {}),
          })),
          artistId: iPid,
          artist:
            iProf && typeof iProf === "object"
              ? omitPrivateProfileFields(iProf)
              : iProf,
        };
      })()
    : undefined;

  return {
    ...rest,
    artistId: profileId,
    artist: profile ? omitPrivateProfileFields(profile) : profile,
    currency: profile?.user?.currency ?? options?.fallbackCurrency ?? "usd",
    downloadableContent: (
      merch as {
        downloadableContent?: {
          downloadableContent: object;
          downloadableContentId: string;
        }[];
      }
    ).downloadableContent?.map((dc) => ({
      ...dc,
      downloadableContent: {
        ...dc.downloadableContent,
        downloadUrl:
          process.env.API_DOMAIN +
          `/v1/downloadableContent/${dc.downloadableContentId}`,
      },
    })),
    images: (merch as { images?: MerchImageWithImage[] }).images?.map(
      serializeMerchImage
    ),
    ...(tgInclude ? { includePurchaseTrackGroup: tgInclude } : {}),
  } as unknown as Serialized<T> & { currency: string };
};
