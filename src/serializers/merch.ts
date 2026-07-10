import { Merch, MerchImage } from "@mirlo/prisma/client";

import { addSizesToImage } from "../utils/artist";
import { finalMerchImageBucket } from "../utils/minio";

import { omitApPrivateKey, Serialized } from "./utils";

export const serializeMerch = <T extends object>(
  merch: T,
  options?: { fallbackCurrency?: string }
): Serialized<T> & { currency: string } => {
  const { profileId, profile, includePurchaseTrackGroup, ...rest } =
    merch as T &
      Merch & { images?: MerchImage[] } & {
        profileId?: number;
        profile?: {
          user?: { currency?: string | null } | null;
        } | null;
        includePurchaseTrackGroup?: {
          profileId?: number;
          profile?: object | null;
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
        return {
          ...iRest,
          artistId: iPid,
          artist:
            iProf && typeof iProf === "object"
              ? omitApPrivateKey(iProf)
              : iProf,
        };
      })()
    : undefined;

  return {
    ...rest,
    artistId: profileId,
    artist: profile ? omitApPrivateKey(profile) : profile,
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
    images: (merch as { images?: MerchImage[] }).images?.map((t) =>
      addSizesToImage(finalMerchImageBucket, t)
    ),
    ...(tgInclude ? { includePurchaseTrackGroup: tgInclude } : {}),
  } as unknown as Serialized<T> & { currency: string };
};
