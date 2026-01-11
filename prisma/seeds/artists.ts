import { Prisma } from "../__generated__";

export const artists: Prisma.ArtistCreateInput[] = [
  {
    name: "Blackbird",
    bio: "Chirp",
    urlSlug: "blackbird",
    user: {
      connect: { email: "artist@admin.example" },
    },
    linksJson: [
      {
        name: "Official Website",
        url: "https://blackbird.example.com",
      },
    ],
  },
  {
    name: "Robin",
    bio: "Chirp Chirp",
    urlSlug: "robin",
    user: {
      connect: { email: "artist@admin.example" },
    },
  },
  {
    name: "Crow",
    bio: "Kaaw",
    urlSlug: "crow",
    user: {
      connect: { email: "artist@admin.example" },
    },
  },
  {
    name: "A Flock of Gulls",
    bio: "Lots of weird noises. We'll steal your food",
    urlSlug: "a-flock-of-gulls",
    user: {
      connect: { email: "label@admin.example" },
    },
  },
  {
    name: "Herring Gull",
    bio: "Lots of weird noises. We'll steal your food. Herrings love herrings.",
    urlSlug: "herring-gull",
    user: {
      connect: { email: "label@admin.example" },
    },
  },
];
