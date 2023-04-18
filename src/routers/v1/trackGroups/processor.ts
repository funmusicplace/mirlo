import { TrackGroup, Track, TrackGroupCover } from "@prisma/client";

import sharpConfig from "../../../config/sharp";

export const generateCover = (url: string) => {
  return `${process.env.STATIC_MEDIA_HOST}/images/${url}.jpg`;
};

export default {
  cover: generateCover,
  single: (
    tg: TrackGroup & {
      cover: TrackGroupCover | null;
      tracks?: Track[];
    }
  ) => ({
    ...tg,
    cover: {
      ...tg.cover,
      sizes: tg.cover?.url.reduce((aggr, url) => {
        return {
          ...aggr,
          [url.split("-x")[1]]: generateCover(url),
        };
      }, {}),
    },
  }),
};
