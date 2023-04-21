import { TrackGroup, Track, TrackGroupCover } from "@prisma/client";
import { convertURLArrayToSizes, generateFullStaticImageUrl } from "./images";
import { finalCoversBucket } from "./minio";

export default {
  cover: generateFullStaticImageUrl,
  single: (
    tg: TrackGroup & {
      cover: TrackGroupCover | null;
      tracks?: Track[];
    }
  ) => ({
    ...tg,
    cover: {
      ...tg.cover,
      sizes: tg.cover
        ? convertURLArrayToSizes(tg.cover?.url, finalCoversBucket)
        : undefined,
    },
  }),
};
