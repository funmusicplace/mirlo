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
    await prisma.merchImage.delete({
      where: {
        id: merchId,
      },
    });

    try {
      removeObjectsFromBucket(finalMerchImageBucket, image.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
  }
};

export const processSingleMerch = (tg: Merch & { images: MerchImage[] }) => ({
  ...tg,
  images: tg.images?.map((t) => addSizesToImage(finalMerchImageBucket, t)),
});

export default {
  single: processSingleMerch,
};
