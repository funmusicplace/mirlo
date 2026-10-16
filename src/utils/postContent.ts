import { generateFullStaticImageUrl } from "./images";
import { finalPostImageBucket } from "./minio";

export type ContentImage = { id: string; extension: string };

export const postImagesForContent = {
  select: { id: true, extension: true },
} as const;

const imgTagRegex = /<img\b[^>]*>/gi;
const imageIdAttrRegex = /\sdata-image-id=(["'])([^"']*)\1/i;
const srcAttrRegex = /(\ssrc=)(["'])([^"']*)\2/i;
const imageIdInUrlRegex =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-x\d+)?\.[a-z0-9]+(?:[?#].*)?$/i;

export const addImageRefs = (content: string, imageIds: string[]) => {
  return content.replace(imgTagRegex, (tag) => {
    if (imageIdAttrRegex.test(tag)) {
      return tag;
    }
    const src = tag.match(srcAttrRegex)?.[3];
    const id = src?.match(imageIdInUrlRegex)?.[1].toLowerCase();
    if (!id || !imageIds.includes(id)) {
      return tag;
    }
    return tag.replace(/^<img\b/i, `<img data-image-id="${id}"`);
  });
};

export const resolveImageRefs = (content: string, images: ContentImage[]) => {
  return content.replace(imgTagRegex, (tag) => {
    const id = tag.match(imageIdAttrRegex)?.[2];
    const image = id && images.find((i) => i.id === id);
    if (!image) {
      return tag;
    }
    const src = generateFullStaticImageUrl(
      image.id,
      finalPostImageBucket,
      image.extension
    );
    return srcAttrRegex.test(tag)
      ? tag.replace(
          srcAttrRegex,
          (_match, attr, quote) => `${attr}${quote}${src}${quote}`
        )
      : tag.replace(/^<img\b/i, () => `<img src="${src}"`);
  });
};

export const resolvePostContent = (post: {
  content?: string | null;
  images: ContentImage[];
}) => {
  return post.content
    ? resolveImageRefs(post.content, post.images)
    : post.content;
};
