import { basename, extname } from "path";

import prisma from "@mirlo/prisma";

import logger from "../logger";

import {
  backendStorage,
  getImagesBucket,
  removeStoredImage,
  S3_ENDPOINT,
  storedImagePrefix,
} from "./minio";

// Module-level cache initialized from DB settings at startup (and refreshed on admin save).
// Kept synchronous so generateFullStaticImageUrl can be used as a plain function reference.
let _cdnUrl: string | undefined;

export const setCdnUrl = (url: string | undefined) => {
  _cdnUrl = url;
};

export const busboyOptions = {
  highWaterMark: 2 * 1024 * 1024,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
};

export const generateFullStaticImageUrl = (
  imageName: string,
  prefix: string,
  extension?: string
) => {
  const effectiveBucket = getImagesBucket();
  const effectiveKey = prefix ? `${prefix}/${imageName}` : imageName;

  if (backendStorage === "minio") {
    return `${process.env.STATIC_MEDIA_HOST}/images/${effectiveBucket}/${effectiveKey}.${extension ?? "webp"}`;
  } else {
    if (_cdnUrl) {
      return `${_cdnUrl}/file/${effectiveBucket}/${effectiveKey}.${extension ?? "webp"}`;
    }
    // Path-style, matching forcePathStyle on the S3 client in minio.ts —
    // virtual-hosted-style (bucket.endpoint) depends on wildcard DNS/TLS for
    // arbitrary bucket subdomains, which isn't reliable on every provider.
    return `${S3_ENDPOINT}/${effectiveBucket}/${effectiveKey}.${extension ?? "webp"}`;
  }
};

export const convertURLArrayToSizes = (urls: string[], prefix: string) => {
  return urls.reduce((aggr, url) => {
    if (!url.includes("-x")) {
      return {
        ...aggr,
        original: generateFullStaticImageUrl(url, prefix),
      };
    }
    return {
      ...aggr,
      [url.split("-x")[1]]: generateFullStaticImageUrl(url, prefix),
    };
  }, {});
};

type StoredImage = { id: string; url: string[]; keyPrefix: string | null };

export const storedImageUrl = (
  image: Pick<StoredImage, "keyPrefix">,
  fileName: string,
  extension?: string
) => generateFullStaticImageUrl(fileName, storedImagePrefix(image), extension);

// Variants are named "<id>-x<width>", entries without a width are the original
const variantWidth = (name: string) => Number(/-x(\d+)$/.exec(name)?.[1]);

// The smallest variant at least `size` wide, else the largest
const smallestAtLeast = (names: string[], size: number) => {
  const sized = names
    .filter((name) => variantWidth(name) > 0)
    .sort((a, b) => variantWidth(a) - variantWidth(b));
  return sized.find((name) => variantWidth(name) >= size) ?? sized.at(-1);
};

export const storedImageVariantUrl = (
  image:
    | (Pick<StoredImage, "url" | "keyPrefix"> & { updatedAt?: Date | string })
    | null
    | undefined,
  size: number,
  options?: { atLeast?: boolean }
) => {
  const variant = options?.atLeast
    ? smallestAtLeast(image?.url ?? [], size)
    : image?.url.find((u) => u.endsWith(`-x${size}`));
  if (!image || !variant) {
    return undefined;
  }
  const url = storedImageUrl(image, variant);
  return image.updatedAt
    ? `${url}?${new Date(image.updatedAt).getTime()}`
    : url;
};

export const storedImageFileUrl = (
  image: Pick<StoredImage, "url" | "keyPrefix">
) => {
  const extension = extname(image.url[0] ?? "");
  return storedImageUrl(
    image,
    basename(image.url[0] ?? "", extension),
    extension.slice(1) || undefined
  );
};

export const deleteStoredImage = async (
  image: Pick<StoredImage, "id" | "keyPrefix">
) => {
  const imageId = image.id;
  await prisma.subscriptionTierImage.deleteMany({ where: { imageId } });
  await prisma.merchImage.deleteMany({ where: { imageId } });
  await prisma.postImage.deleteMany({ where: { imageId } });
  await prisma.post.updateMany({
    where: { featuredImageId: imageId },
    data: { featuredImageId: null },
  });
  await prisma.profile.updateMany({
    where: { avatarImageId: imageId },
    data: { avatarImageId: null },
  });
  await prisma.profile.updateMany({
    where: { backgroundImageId: imageId },
    data: { backgroundImageId: null },
  });
  await prisma.trackGroup.updateMany({
    where: { coverImageId: imageId },
    data: { coverImageId: null },
  });
  await prisma.settings.updateMany({
    where: { splashImageId: imageId },
    data: { splashImageId: null },
  });
  await prisma.image.delete({ where: { id: imageId } });

  try {
    await removeStoredImage(image);
  } catch (e) {
    logger.info(`No stored objects for image ${imageId}, that's okay`);
  }
};
