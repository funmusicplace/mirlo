import prisma from "../prisma/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { buildTokens } from "../src/routers/auth";

export const clearTables = async () => {
  await prisma.$executeRaw`DELETE FROM "ActivityPubArtistFollowers";`;
  await prisma.$executeRaw`DELETE FROM "Notification";`;
  await prisma.$executeRaw`DELETE FROM "PostImage";`;
  await prisma.$executeRaw`DELETE FROM "MerchPurchase";`;
  await prisma.$executeRaw`DELETE FROM "Merch";`;
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscriptionCharge";`;
  await prisma.$executeRaw`DELETE FROM "UserArtistNotificationSetting";`;
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscription";`;
  await prisma.$executeRaw`DELETE FROM "ArtistSubscriptionTier";`;
  await prisma.$executeRaw`DELETE FROM "Post";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupTag";`;
  await prisma.$executeRaw`DELETE FROM "Tag";`;
  await prisma.$executeRaw`DELETE FROM "TrackArtist";`;
  await prisma.$executeRaw`DELETE FROM "TrackAudio";`;
  await prisma.$executeRaw`DELETE FROM "Track";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupWishlist";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupPurchase";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupCover";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupDownloadCodes";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroup";`;
  await prisma.$executeRaw`DELETE FROM "ArtistBanner";`;
  await prisma.$executeRaw`DELETE FROM "UserArtistTip";`;
  await prisma.$executeRaw`DELETE FROM "ArtistAvatar";`;
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscriptionConfirmation";`;
  await prisma.$executeRaw`DELETE FROM "Artist";`;
  await prisma.$executeRaw`DELETE FROM "User";`;
  await prisma.$executeRaw`DELETE FROM "Client";`;
  await prisma.$executeRaw`DELETE FROM "Settings";`;
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
  const post = await prisma.post.create({
    data: {
      title: data?.title ?? "Test title",
      artistId: artistId,
      isPublic: data?.isPublic ?? true,
      content: data?.content ?? "The content",
      shouldSendEmail: data?.shouldSendEmail,
      isDraft: data?.isDraft ?? true,
    },
  });
  return post;
};

export const createTier = async (
  artistId: number,
  data?: Partial<Prisma.ArtistSubscriptionTierCreateArgs["data"]>
) => {
  const tier = await prisma.artistSubscriptionTier.create({
    data: {
      minAmount: data?.minAmount,
      allowVariable: data?.allowVariable,
      name: data?.name ?? "Test title",
      artistId: artistId,
      isDefaultTier: data?.isDefaultTier,
    },
  });
  return tier;
};

export const createTrackGroup = async (
  artistId: number,
  data?: Partial<Prisma.TrackGroupCreateArgs["data"]> & {
    tracks?: { title: string }[];
  }
) => {
  const tg = await prisma.trackGroup.create({
    data: {
      minPrice: data?.minPrice,
      title: data?.title ?? "Test trackGroup",
      urlSlug: data?.urlSlug ?? "test-trackgroup",
      artistId: artistId,
      published: data?.published ?? true,
      stripeProductKey: data?.stripeProductKey ?? null,
      paymentToUserId: data?.paymentToUserId,
      releaseDate: data?.releaseDate,
      cover:
        data?.cover !== undefined
          ? data.cover
          : {
              create: {
                url: ["test-url"],
              },
            },
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
  return tg;
};

export const createMerch = async (
  artistId: number,
  data?: Partial<Prisma.MerchCreateArgs["data"]>
) => {
  const tg = await prisma.merch.create({
    data: {
      minPrice: data?.minPrice ?? 0,
      description: data?.description ?? "Test description",
      quantityRemaining: data?.quantityRemaining ?? 0,
      includePurchaseTrackGroupId: data?.includePurchaseTrackGroupId,
      isPublic: false,
      title: data?.title ?? "Test trackGroup",
      artistId: artistId,
    },
  });
  return tg;
};

export const createTrack = async (
  trackGroupId: number,
  data?: Partial<Prisma.TrackCreateArgs["data"]>
) => {
  const track = await prisma.track.create({
    data: {
      title: data?.title,
      trackGroupId,
    },
  });

  await prisma.trackAudio.create({
    data: {
      trackId: track.id,
      uploadState: "SUCCESS",
    },
  });
  return track;
};
