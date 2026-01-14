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
  {
    title: "We hate birds actually",
    about: "This album features various bird songs.",
    urlSlug: "we-hate-birds-actually",
    artist: {
      connect: {
        id: 2,
      },
    },
  },
  {
    title: "CROW ATTACK",
    about: "This album features various bird songs.",
    urlSlug: "crow-attack",
    artist: {
      connect: {
        id: 2,
      },
    },
  },
  {
    title: "words",
    about: "This album features various bird songs.",
    urlSlug: "words",
    artist: {
      connect: {
        id: 3,
      },
    },
  },
];
