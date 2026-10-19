import { backendStorage, getImagesBucket, S3_ENDPOINT } from "./minio";

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
