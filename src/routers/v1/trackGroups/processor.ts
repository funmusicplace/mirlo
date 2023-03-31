import { TrackGroup, Track, TrackGroupCover } from "@prisma/client";

import sharpConfig from "../../../config/sharp";

export default {
  single: (
    tg: TrackGroup & {
      cover: TrackGroupCover | null;
      tracks: Track[];
    }
  ) => ({
    ...tg,
    cover: {
      ...tg.cover,
      sizes: tg.cover?.url.reduce((aggr, url) => {
        return {
          ...aggr,
          [url.split(
            "-x"
          )[1]]: `${process.env.STATIC_MEDIA_HOST}/images/${url}.jpg`,
        };
      }, {}),
    },
  }),
};
