import { backendStorage } from "./minio";

const { S3_REGION = "" } = process.env;

export const busboyOptions = {
  highWaterMark: 2 * 1024 * 1024,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
};

export const generateFullStaticImageUrl = (
  imageName: string,
  bucket: string,
  extension?: string
) => {
  if (backendStorage === "minio") {
    return `${process.env.STATIC_MEDIA_HOST}/images/${bucket}/${imageName}.${extension ?? "webp"}`;
  } else {
    return `https://${bucket}.s3.${S3_REGION}.backblazeb2.com/${imageName}.${extension ?? "webp"}`;
  }
};

export const convertURLArrayToSizes = (urls: string[], bucket: string) => {
  return urls.reduce((aggr, url) => {
    if (!url.includes("-x")) {
      return {
        ...aggr,
        original: generateFullStaticImageUrl(url, bucket),
      };
    }
    return {
      ...aggr,
      [url.split("-x")[1]]: generateFullStaticImageUrl(url, bucket),
    };
  }, {});
};
