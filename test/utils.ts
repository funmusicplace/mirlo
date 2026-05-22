import { Prisma } from "@mirlo/prisma/client";
// @ts-ignore: Ignore import errors for github-slugger
import { slug } from "github-slugger";

import prisma from "../prisma/prisma";
import { buildTokens, hashPassword } from "../src/routers/auth/utils";

export const clearTables = async () => {
  // Single TRUNCATE replaces ~40 sequential DELETE statements that were
  // running per test and occasionally exceeding mocha's 2s hook timeout
  // under CI load. CASCADE handles FK ordering so we don't have to.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ActivityPubArtistFollowers",
      "Artist",
      "ArtistAvatar",
      "ArtistBackground",
      "ArtistLabel",
      "ArtistSubscriptionTier",
      "ArtistTipTier",
      "ArtistUserSubscription",
      "ArtistUserSubscriptionCharge",
      "ArtistUserSubscriptionConfirmation",
      "Client",
      "Fundraiser",
      "FundraiserPledge",
      "Invite",
      "Merch",
      "MerchPurchase",
      "Notification",
      "Post",
      "PostImage",
      "RecommendedTrackGroup",
      "Settings",
      "SubscriptionTierRelease",
      "Tag",
      "Track",
      "TrackArtist",
      "TrackAudio",
      "TrackGroup",
      "TrackGroupCover",
      "TrackGroupDownloadCodes",
      "TrackGroupDownloadableContent",
      "TrackGroupTag",
      "TrackPlay",
      "User",
      "UserArtistNotificationSetting",
      "UserArtistTip",
      "UserTrackGroupPurchase",
      "UserTrackGroupWishlist",
      "UserTrackPurchase",
      "UserTransaction"
    CASCADE;
  `);
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
      urlSlug: data?.urlSlug || (data?.name ? slug(data?.name) : "test-artist"),
      userId: userId,
      enabled: data?.enabled ?? true,
      subscriptionTiers: data?.subscriptionTiers,
      activityPub: data?.activityPub ?? false,
      isLabelProfile: data?.isLabelProfile ?? false,
      paymentToUserId: data?.paymentToUserId,
      allowDirectMessages: data?.allowDirectMessages ?? false,
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
      urlSlug: data?.urlSlug || (data?.title ? slug(data?.title) : "test-post"),
      content: data?.content ?? "The content",
      shouldSendEmail: data?.shouldSendEmail,
      isDraft: data?.isDraft ?? true,
      publishedAt: data?.publishedAt ?? new Date(),
      hasActivityPubBeenSent: data?.hasActivityPubBeenSent ?? false,
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
    tracks?: {
      title: string;
      isPreview?: boolean;
      order?: number;
      audio?: { create: { uploadState?: "SUCCESS" } };
    }[];
  } & Partial<Prisma.TrackGroupCreateArgs["data"]>
) => {
  const tg = await prisma.trackGroup.create({
    data: {
      minPrice: data?.minPrice,
      suggestedPrice: data?.suggestedPrice,
      title: data?.title ?? "Test trackGroup",
      urlSlug:
        data?.urlSlug || (data?.title ? slug(data?.title) : "test-trackgroup"),
      artistId: artistId,
      publishedAt:
        data?.publishedAt === null ? null : (data?.publishedAt ?? new Date()),
      isGettable: data?.isGettable ?? true,
      stripeProductKey: data?.stripeProductKey ?? null,
      paymentToUserId: data?.paymentToUserId,
      releaseDate:
        data?.releaseDate === null ? null : (data?.releaseDate ?? new Date()),
      isPreorder: data?.isPreorder ?? false,
      hideFromSearch: data?.hideFromSearch ?? false,
      ...(data?.isPublic !== undefined && { isPublic: data.isPublic }),
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
  const merch = await prisma.merch.create({
    data: {
      minPrice: data?.minPrice ?? 0,
      description: data?.description ?? "Test description",
      quantityRemaining: data?.quantityRemaining ?? 0,
      includePurchaseTrackGroupId: data?.includePurchaseTrackGroupId,
      isPublic: data?.isPublic ?? false,
      title: data?.title ?? "Test trackGroup",
      artistId: artistId,
      urlSlug: slug(data?.title ?? "test-merch"),
    },
  });

  return merch;
};

export const createMerchShippingDestination = async (data: {
  merchId: string;
  homeCountry?: string;
  destinationCountry?: string | null;
  costUnit?: number;
  costExtraUnit?: number;
}) => {
  return prisma.merchShippingDestination.create({
    data: {
      merchId: data.merchId,
      homeCountry: data.homeCountry ?? "us",
      destinationCountry: data.destinationCountry ?? null,
      costUnit: data.costUnit ?? 0,
      costExtraUnit: data.costExtraUnit ?? 0,
    },
  });
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
      allowIndividualSale: data?.allowIndividualSale,
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
      currency: data?.currency ?? "usd",
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
      currency: data?.currency ?? "usd",
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

export const createSiteSettings = async (data?: Record<string, any>) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      settings: data || ({} as any),
    },
    create: {
      settings: data || ({} as any),
    },
  });
  return settings;
};

export const getUserByEmail = async (email: string) => {
  return prisma.user.findFirst({
    where: { email },
  });
};

export const createSubscription = async (
  userId: number,
  tierId: number,
  amount: number = 500
) => {
  return prisma.artistUserSubscription.create({
    data: {
      userId,
      artistSubscriptionTierId: tierId,
      amount,
    },
  });
};

export const createNotification = async (data: {
  userId: number;
  notificationType: string;
  trackGroupId?: number;
  relatedUserId?: number;
  artistId?: number;
}) => {
  return prisma.notification.create({ data: data as any });
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
  getUserByEmail,
  createSubscription,
  createNotification,
  createMerch,
  createMerchShippingDestination,
};
