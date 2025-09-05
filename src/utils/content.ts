import prisma from "@mirlo/prisma";
import {
  downloadableContentBucket,
  removeObjectsFromBucket,
} from "../utils/minio";
import logger from "../logger";

export const deleteDownloadableContent = async (contentId: string) => {
  await prisma.trackGroupDownloadableContent.deleteMany({
    where: {
      downloadableContentId: contentId,
    },
  });
  await prisma.merchDownloadableContent.deleteMany({
    where: {
      downloadableContentId: contentId,
    },
  });

  const content = await prisma.downloadableContent.findFirst({
    where: {
      id: contentId,
    },
  });

  if (content) {
    try {
      await removeObjectsFromBucket(downloadableContentBucket, content.id);
    } catch (e) {
      logger.error("no object found, that's all right though");
    }
    await prisma.downloadableContent.delete({
      where: {
        id: content.id,
      },
    });
  }
};
