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
      sizes: sharpConfig.config.artwork.jpeg.variants.reduce(
        (aggr, v) => ({
          ...aggr,
          [v.width]: tg.cover
            ? `${process.env.STATIC_MEDIA_HOST}/images/${tg.cover.id}-x${v.width}.jpg`
            : null,
        }),
        {}
      ),
    },
  }),
};
