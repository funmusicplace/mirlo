import prisma from "@mirlo/prisma";

import logger from "../logger";
import { removeDownloadableContent } from "../utils/minio";

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
      await removeDownloadableContent(content.id);
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
