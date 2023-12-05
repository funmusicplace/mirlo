import prisma from "../prisma/prisma";
import { Prisma } from "@prisma/client";
import { buildTokens } from "../src/routers/auth";

export const clearTables = async () => {
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscription";`;
  await prisma.$executeRaw`DELETE FROM "ArtistSubscriptionTier";`;
  await prisma.$executeRaw`DELETE FROM "Post";`;
  await prisma.$executeRaw`DELETE FROM "TrackArtist";`;
  await prisma.$executeRaw`DELETE FROM "TrackAudio";`;
  await prisma.$executeRaw`DELETE FROM "Track";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupWishlist";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupPurchase";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupCover";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroup";`;
  await prisma.$executeRaw`DELETE FROM "Artist";`;
  await prisma.$executeRaw`DELETE FROM "User";`;
};

export const createUser = async (data: Prisma.UserCreateArgs["data"]) => {
  const user = await prisma.user.create({
    data,
  });

  const { accessToken } = buildTokens(user);

  return {
    user,
    accessToken,
  };
};

export const createArtist = async (
  userId: number,
  data?: Partial<Prisma.ArtistCreateArgs["data"]>
) => {
  const artist = await prisma.artist.create({
    data: {
      name: data?.name ?? "Test artist",
      urlSlug: data?.urlSlug ?? "test-artist",
      userId: userId,
      enabled: data?.enabled ?? true,
      subscriptionTiers: data?.subscriptionTiers,
    },
    include: {
      subscriptionTiers: true,
    },
  });
  return artist;
};

export const createPost = async (
  artistId: number,
  data?: Partial<Prisma.PostCreateArgs["data"]>
) => {
  const artist = await prisma.post.create({
    data: {
      title: data?.title ?? "Test title",
      artistId: artistId,
      content: data?.content ?? "The content",
    },
  });
  return artist;
};

export const createTrackGroup = async (
  artistId: number,
  data?: Partial<Prisma.TrackGroupCreateArgs["data"]>
) => {
  const artist = await prisma.trackGroup.create({
    data: {
      minPrice: data?.minPrice,
      title: data?.title ?? "Test trackGroup",
      urlSlug: data?.urlSlug ?? "test-artist",
      artistId: artistId,
      published: data?.published ?? true,
      releaseDate: data?.releaseDate,
      tracks: {
        create: data?.tracks ?? [
          {
            title: "test track",
            audio: {
              create: {
                uploadState: "SUCCESS",
              },
            },
          },
        ],
      },
    },
  });
  return artist;
};
