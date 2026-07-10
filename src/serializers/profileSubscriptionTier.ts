import { Image, TrackGroupCover } from "@mirlo/prisma/client";

import { addSizesToImage } from "../utils/artist";
import { finalCoversBucket, finalImageBucket } from "../utils/minio";

import { omitApPrivateKey, Serialized } from "./utils";

/**
 * Enrich a subscription tier and emit artist* wire shape.
 */
export const serializeProfileSubscriptionTier = <T extends object>(
  tier: T
): Serialized<T> => {
  const {
    profileId,
    profile: _profile,
    images,
    releases,
    ...rest
  } = tier as T & {
    profileId?: number;
    profile?: object | null;
    images?: { image: Image }[];
    releases?: {
      trackGroup?: {
        profileId?: number;
        profile?: { id?: number } | null;
        cover?: TrackGroupCover | null;
      } | null;
    }[];
  };

  return {
    ...rest,
    artistId: profileId,
    images: images?.map((img) => ({
      ...img,
      image: addSizesToImage(finalImageBucket, img.image),
    })),
    releases: releases?.map((rel) => {
      const {
        profileId: tgPid,
        profile: tgProf,
        ...tgRest
      } = rel.trackGroup ?? {};
      return {
        ...rel,
        trackGroup: {
          ...tgRest,
          artistId: tgPid ?? tgProf?.id,
          artist:
            tgProf && typeof tgProf === "object"
              ? omitApPrivateKey(tgProf)
              : tgProf,
          cover: addSizesToImage(finalCoversBucket, rel.trackGroup?.cover),
        },
      };
    }),
  } as Serialized<T>;
};
