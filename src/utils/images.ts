export const generateFullStaticImageUrl = (url: string, bucket: string) => {
  return `${process.env.STATIC_MEDIA_HOST}/images/${bucket}/${url}.jpg`;
};

export const convertURLArrayToSizes = (urls: string[], bucket: string) => {
  return urls.reduce((aggr, url) => {
    return {
      ...aggr,
      [url.split("-x")[1]]: generateFullStaticImageUrl(url, bucket),
    };
  }, {});
};
