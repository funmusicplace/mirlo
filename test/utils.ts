import prisma from "../prisma/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { buildTokens, hashPassword } from "../src/routers/auth/utils";

export const clearTables = async () => {
  await prisma.$executeRaw`DELETE FROM "RecommendedTrackGroup";`;
  await prisma.$executeRaw`DELETE FROM "FundraiserPledge";`;
  await prisma.$executeRaw`DELETE FROM "Fundraiser";`;
  await prisma.$executeRaw`DELETE FROM "ArtistLabel";`;
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
  await prisma.$executeRaw`DELETE FROM "UserTransaction";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackPurchase";`;
  await prisma.$executeRaw`DELETE FROM "TrackPlay";`;
  await prisma.$executeRaw`DELETE FROM "Track";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupWishlist";`;
  await prisma.$executeRaw`DELETE FROM "UserTrackGroupPurchase";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupCover";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupDownloadableContent";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroupDownloadCodes";`;
  await prisma.$executeRaw`DELETE FROM "TrackGroup";`;
  await prisma.$executeRaw`DELETE FROM "ArtistBanner";`;
  await prisma.$executeRaw`DELETE FROM "UserArtistTip";`;
  await prisma.$executeRaw`DELETE FROM "ArtistAvatar";`;
  await prisma.$executeRaw`DELETE FROM "ArtistUserSubscriptionConfirmation";`;
  await prisma.$executeRaw`DELETE FROM "Artist";`;
  await prisma.$executeRaw`DELETE FROM "Invite";`;
  await prisma.$executeRaw`DELETE FROM "User";`;
  await prisma.$executeRaw`DELETE FROM "Client";`;
  await prisma.$executeRaw`DELETE FROM "Settings";`;
};

export const createClient = async (clientKey: string) => {
  const client = await prisma.client.create({
    data: {
      key: clientKey,
      applicationName: "Test Client",
      applicationUrl: "http://localhost",
      allowedCorsOrigins: ["http://localhost/callback"],
    },
  });
  return client;
};

export const createUser = async (data: Prisma.UserCreateArgs["data"]) => {
  const createData: Prisma.UserCreateArgs["data"] = {
    ...data,
    password: data.password ? await hashPassword(data.password) : undefined,
  };

  const user = await prisma.user.create({
    data: createData,
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
      urlSlug: data?.urlSlug ?? "test-post",
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
  data?: {
    tracks?: { title: string }[];
  } & Partial<Prisma.TrackGroupCreateArgs["data"]>
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
      description: data?.description,
      stripeProductKey: data?.stripeProductKey,
      minPrice: data?.minPrice,
      isPreview: data?.isPreview,
      order: data?.order,
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

export const createUserTrackGroupPurchase = async (
  userId: number,
  trackGroupId: number,
  data?: { amount?: number; currency?: string; createdAt?: Date }
) => {
  const transaction = await prisma.userTransaction.create({
    data: {
      userId,
      amount: data?.amount ?? 1000,
      currency: data?.currency ?? "USD",
      createdAt: data?.createdAt,
      paymentStatus: "COMPLETED",
    },
  });

  const purchase = await prisma.userTrackGroupPurchase.create({
    data: {
      userId,
      trackGroupId,
      userTransactionId: transaction.id,
    },
  });

  return purchase;
};

export const createUserTrackPurchase = async (
  userId: number,
  trackId: number,
  data?: { amount?: number; currency?: string; createdAt?: Date }
) => {
  const transaction = await prisma.userTransaction.create({
    data: {
      userId,
      amount: data?.amount ?? 1000,
      currency: data?.currency ?? "USD",
      createdAt: data?.createdAt,
    },
  });
  const purchase = await prisma.userTrackPurchase.create({
    data: {
      userId,
      trackId,
      transactionId: transaction.id,
    },
  });
  return purchase;
};

export const createTrackPlay = async (
  trackId: number,
  data?: Partial<Prisma.TrackPlayCreateArgs["data"]>
) => {
  const trackPlay = await prisma.trackPlay.create({
    data: {
      trackId: trackId,
    },
  });
  return trackPlay;
};

export const createFundraiser = async (
  trackGroupId: number,
  data?: Partial<Prisma.FundraiserCreateArgs["data"]>
) => {
  const fundraiser = await prisma.fundraiser.create({
    data: {
      name: data?.name ?? "Test Fundraiser",
      goalAmount: data?.goalAmount ?? 50000,
      description: data?.description,
      isAllOrNothing: data?.isAllOrNothing ?? false,
      status: data?.status ?? "ACTIVE",
      endDate: data?.endDate,
      trackGroups: {
        connect: {
          id: trackGroupId,
        },
      },
    },
  });
  return fundraiser;
};

export const createFundraiserPledge = async (
  fundraiserId: number,
  userId: number,
  data?: Partial<Prisma.FundraiserPledgeCreateArgs["data"]>
) => {
  const pledge = await prisma.fundraiserPledge.create({
    data: {
      fundraiserId,
      userId,
      amount: data?.amount ?? 5000,
      stripeSetupIntentId:
        data?.stripeSetupIntentId ?? `seti_test_${Math.random()}`,
      trackGroupId: data?.trackGroupId,
      message: data?.message,
      paidAt: data?.paidAt,
      cancelledAt: data?.cancelledAt,
    },
  });
  return pledge;
};

export default {
  createArtist,
  createPost,
  createTier,
  createTrackGroup,
  createTrack,
  createUser,
  createUserTrackGroupPurchase,
  createUserTrackPurchase,
  createTrackPlay,
  createFundraiser,
  createFundraiserPledge,
  clearTables,
  createClient,
};
