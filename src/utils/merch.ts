import { Merch, MerchImage } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { finalMerchImageBucket, removeObjectsFromBucket } from "./minio";
import { addSizesToImage } from "./artist";

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
      console.log(e);
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

  await prisma.merch.delete({
    where: {
      id: merchId,
    },
  });
};

export const processSingleMerch = (
  merch: Merch & { images: MerchImage[] }
) => ({
  ...merch,
  images: merch.images?.map((t) => addSizesToImage(finalMerchImageBucket, t)),
});

export default {
  single: processSingleMerch,
};
