import { backendStorage } from "./minio";

const { BACKBLAZE_REGION = "" } = process.env;

export const generateFullStaticImageUrl = (
  imageName: string,
  bucket: string,
  extension?: string
) => {
  if (backendStorage === "minio") {
    return `${process.env.STATIC_MEDIA_HOST}/images/${bucket}/${imageName}.${extension ?? "webp"}`;
  } else {
    return `https://${bucket}.s3.${BACKBLAZE_REGION}.backblaze2.com/${imageName}.${extension ?? "webp"}`;
  }
};

export const convertURLArrayToSizes = (urls: string[], bucket: string) => {
  return urls.reduce((aggr, url) => {
    return {
      ...aggr,
      [url.split("-x")[1]]: generateFullStaticImageUrl(url, bucket),
    };
  }, {});
};
