import prisma from "@mirlo/prisma";
import { fromStream } from "file-type";

import logger from "../logger";
import { clearTrackGroupDownloads } from "../utils/downloadCache";
import {
  getDownloadableContentReadStream,
  removeDownloadableContent,
} from "../utils/minio";

// Keep in sync with DOWNLOADABLE_CONTENT_MIME_TYPES on the client.
export const DOWNLOADABLE_CONTENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/epub+zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const TEXT_MIME_TYPES = ["text/plain", "text/markdown"];

export const isAllowedDownloadableContentMimeType = (
  mimeType?: string | null
): mimeType is string =>
  !!mimeType && DOWNLOADABLE_CONTENT_MIME_TYPES.includes(mimeType);

export const doesDownloadableContentMatchType = async (
  contentId: string,
  mimeType: string
) => {
  const stream = await getDownloadableContentReadStream(contentId);
  if (!stream) {
    return false;
  }
  try {
    const detected = await fromStream(stream);
    if (TEXT_MIME_TYPES.includes(mimeType)) {
      return !detected;
    }
    return detected?.mime === mimeType;
  } finally {
    stream.destroy();
  }
};

export const deleteDownloadableContent = async (contentId: string) => {
  const trackGroupLinks = await prisma.trackGroupDownloadableContent.findMany({
    where: { downloadableContentId: contentId },
    select: { trackGroupId: true },
  });
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

  await Promise.all(
    trackGroupLinks.map((link) => clearTrackGroupDownloads(link.trackGroupId))
  );
};
