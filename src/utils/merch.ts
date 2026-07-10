import prisma from "@mirlo/prisma";
import { Merch, MerchImage } from "@mirlo/prisma/client";

import logger from "../logger";

import { addSizesToImage } from "./artist";
import { withArtistFields } from "./serialize/apiNaming";
import { processSingleTrackGroup } from "./serialize/trackGroup";
import { deleteDownloadableContent } from "./content";
import { finalMerchImageBucket, removeObjectsFromBucket } from "./minio";

export const deleteMerchCover = async (merchId: string) => {
  const image = await prisma.merchImage.findFirst({
    where: {
      merchId,
    },
  });

  if (image) {
    try {
      await prisma.merchImage.delete({
        where: {
          id: merchId,
        },
      });
    } catch (e) {
      logger.error(`Error deleting merch cover`);
      console.error(e);
    }

    try {
      removeObjectsFromBucket(finalMerchImageBucket, image.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
  }
};

/**
 * We use our own custom function to handle this until we
 * can figure out a way to soft delete cascade. Maybe
 * we can't?
 *
 * @param trackGroupId
 */
export const deleteMerch = async (merchId: string) => {
  await deleteMerchCover(merchId);

  const downloadableContents = await prisma.merchDownloadableContent.findMany({
    where: {
      merchId,
    },
  });

  await Promise.all(
    downloadableContents.map((dc) =>
      deleteDownloadableContent(dc.downloadableContentId)
    )
  );

  await prisma.merch.delete({
    where: {
      id: merchId,
    },
  });
};

export const processSingleMerch = (
  merch: Merch & { images?: MerchImage[] } & {
    artist?: Record<string, unknown> | null;
    profile?: Record<string, unknown> | null;
    includePurchaseTrackGroup?: Record<string, unknown> | null;
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
  },
  options?: { fallbackCurrency?: string }
): Record<string, unknown> => {
  const {
    profileId,
    artist,
    profile,
    includePurchaseTrackGroup,
    ...merchRest
  } = merch as Merch & {
    profileId: number;
    artist?: { user?: { currency?: string | null } | null } | null;
    profile?: { user?: { currency?: string | null } | null } | null;
    includePurchaseTrackGroup?: Record<string, unknown> | null;
    images?: MerchImage[];
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
  };

  const profileRelation = profile ?? artist;

  return {
    ...withArtistFields({ ...merchRest, profileId, profile: profileRelation }),
    currency:
      (profileRelation as { user?: { currency?: string | null } | null })?.user
        ?.currency ??
      options?.fallbackCurrency ??
      "usd",
    ...(includePurchaseTrackGroup
      ? {
          includePurchaseTrackGroup: processSingleTrackGroup(
            includePurchaseTrackGroup as Parameters<
              typeof processSingleTrackGroup
            >[0]
          ),
        }
      : {}),
    downloadableContent: merch.downloadableContent?.map((dc) => ({
      ...dc,
      downloadableContent: {
        ...dc.downloadableContent,
        downloadUrl:
          process.env.API_DOMAIN +
          `/v1/downloadableContent/${dc.downloadableContentId}`,
      },
    })),
    images: merch.images?.map((t) => addSizesToImage(finalMerchImageBucket, t)),
  };
};

export default {
  single: processSingleMerch,
};
