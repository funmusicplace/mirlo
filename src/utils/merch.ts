import prisma from "@mirlo/prisma";
import { finalMerchImageBucket, removeObjectsFromBucket } from "./minio";

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
