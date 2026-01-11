import { Prisma } from "../__generated__";

export const trackGroups: Prisma.TrackGroupCreateInput[] = [
  {
    title: "The Bird Album",
    about: "This album features various bird songs.",
    urlSlug: "the-bird-album",
    artist: {
      connect: {
        id: 1,
      },
    },
  },
];
