import * as cheerio from "cheerio";

import { generateFullStaticImageUrl } from "./images";
import { finalPostImageBucket } from "./minio";

export type ContentImage = { id: string; extension: string };

export const postImagesForContent = {
  select: { id: true, extension: true },
} as const;

const imageIdInUrlRegex =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-x\d+)?\.[a-z0-9]+(?:[?#].*)?$/i;

export const addImageRefs = (content: string, imageIds: string[]) => {
  if (!/<img\b/i.test(content)) {
    return content;
  }
  const $ = cheerio.load(content, null, false);
  let changed = false;
  $("img:not([data-image-id])").each((_, el) => {
    const id = $(el).attr("src")?.match(imageIdInUrlRegex)?.[1].toLowerCase();
    if (id && imageIds.includes(id)) {
      $(el).attr("data-image-id", id);
      changed = true;
    }
  });
  return changed ? $.html() : content;
};

export const resolveImageRefs = (content: string, images: ContentImage[]) => {
  if (!content.includes("data-image-id")) {
    return content;
  }
  const $ = cheerio.load(content, null, false);
  $("img[data-image-id]").each((_, el) => {
    const image = images.find((i) => i.id === $(el).attr("data-image-id"));
    if (image) {
      $(el).attr(
        "src",
        generateFullStaticImageUrl(
          image.id,
          finalPostImageBucket,
          image.extension
        )
      );
    }
  });
  return $.html();
};

export const resolvePostContent = (post: {
  content?: string | null;
  images: ContentImage[];
}) => {
  return post.content
    ? resolveImageRefs(post.content, post.images)
    : post.content;
};
