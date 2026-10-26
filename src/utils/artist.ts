import prisma, { SafeUser } from "@mirlo/prisma";
import {
  User,
  ProfileSubscriptionTier,
  Profile,
  Prisma,
} from "@mirlo/prisma/client";
import {
  DefaultArgs,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/client";
import { NextFunction, Request, Response } from "express";

import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { serializeProfile } from "../serializers/artist";

import { AppError } from "./error";
import generateSlug from "./generateSlug";
import { getClient } from "./getClient";
import {
  convertURLArrayToSizes,
  deleteStoredImage,
  storedImageVariantUrl,
} from "./images";
import { deleteMerch, merchImagesInclude } from "./merch";
import { storedImagePrefix } from "./minio";
import { postImagesForContent } from "./postContent";
import reservedProfileSlugs from "./reservedProfileSlugs";
import { getSiteSettings } from "./settings";
import stripe from "./stripe";
import { subscriptionTierOrderBy } from "./subscriptionTier";
import {
  deleteTrackGroup,
  subscriptionTierReleasesCount,
  trackGroupPublishedObject,
  whereForPublishedTrackGroups,
} from "./trackGroup";
export { serializeProfile };

type Params = {
  id: string;
};

export const confirmProfileIdExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: profileId } = req.params as unknown as Params;

  if (!profileId || Number.isNaN(profileId)) {
    const error = new AppError({
      name: "Artist ID must be valid number",
      httpCode: 400,
      description: "Artist ID must be valid number",
    });
    return next(error);
  }
  try {
    const profile = await prisma.profile.findFirst({
      where: {
        id: Number(profileId),
      },
      select: {
        id: true,
      },
    });
    if (!profile) {
      const error = new AppError({
        name: "Artist not found",
        httpCode: 404,
        description: "Artist not found",
      });
      return next(error);
    }
    next();
  } catch (e) {
    next(e);
  }
};

export const checkIsUserSubscriber = async (
  user?: User,
  profileId?: number | null
) => {
  let userSubscriber = false;

  if (!profileId) {
    return true;
  }

  if (user) {
    const subscriber = await prisma.profileUserSubscription.findFirst({
      where: {
        userId: user.id,
        profileSubscriptionTier: {
          profileId,
        },
      },
    });

    userSubscriber = !!subscriber;
  }
  return userSubscriber;
};

export const getPlatformFeeForProfile = async (
  profileId: number | string | null
): Promise<number> => {
  const settings = await getSiteSettings();
  if (!profileId) {
    return settings.platformPercent;
  }

  const profile = await prisma.profile.findFirst({
    where: {
      id: Number(profileId),
    },
    select: {
      defaultPlatformFee: true,
    },
  });

  return profile?.defaultPlatformFee ?? settings.platformPercent;
};

export const whereForProfilesUserManages = (
  userId: number
): Prisma.ProfileWhereInput => ({
  managers: { some: { userId, acceptedAt: { not: null } } },
});

export const whereForProfilesUserOwnsOrManages = (
  userId: number
): Prisma.ProfileWhereInput => ({
  OR: [{ userId }, whereForProfilesUserManages(userId)],
});

export const whereForAllProfilesUserCanEdit = (
  userId: number
): Prisma.ProfileWhereInput => ({
  OR: [
    { userId },
    whereForProfilesUserManages(userId),
    {
      artistLabels: {
        some: {
          labelUserId: userId,
          canLabelManageArtist: true,
          isArtistApproved: true,
          isLabelApproved: true,
        },
      },
    },
  ],
});

export const resolveManagedArtistIds = async (
  userId: number,
  requestedArtistIds?: string | string[] | number[]
): Promise<number[]> => {
  let requested: number[] | undefined;
  if (requestedArtistIds !== undefined) {
    const raw =
      typeof requestedArtistIds === "string"
        ? requestedArtistIds.split(",")
        : requestedArtistIds;
    requested = raw.map((a) => Number(a)).filter((n) => Number.isFinite(n));
  }

  const managed = await prisma.profile.findMany({
    where: {
      ...(requested !== undefined
        ? whereForAllProfilesUserCanEdit(userId)
        : whereForProfilesUserOwnsOrManages(userId)),
      ...(requested !== undefined ? { id: { in: requested } } : {}),
    },
    select: { id: true },
  });

  return managed.map((a) => a.id);
};

export const buyerUserSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export const whereForAllProfilesUserCanAddReleasesFor = (
  userId: number
): Prisma.ProfileWhereInput => ({
  OR: [
    { userId },
    whereForProfilesUserManages(userId),
    {
      artistLabels: {
        some: {
          labelUserId: userId,
          canLabelAddReleases: true,
          isArtistApproved: true,
          isLabelApproved: true,
        },
      },
    },
  ],
});

export const canUserEditProfile = async (
  profileId: number | null | undefined,
  user: { id: number; isAdmin?: boolean | null } | null | undefined,
  { allowAdmin = true }: { allowAdmin?: boolean } = {}
): Promise<boolean> => {
  if (!user || !profileId) {
    return false;
  }
  if (allowAdmin && user.isAdmin) {
    return true;
  }
  const profile = await prisma.profile.findFirst({
    where: {
      id: Number(profileId),
      ...whereForAllProfilesUserCanEdit(user.id),
    },
    select: { id: true },
  });
  return !!profile;
};

export const getEditableProfileIds = async (
  userId: number
): Promise<number[]> => {
  const profiles = await prisma.profile.findMany({
    where: whereForAllProfilesUserCanEdit(userId),
    select: { id: true },
  });
  return profiles.map((p) => p.id);
};

export const profileDeleted: Prisma.ProfileWhereInput = {
  deletedAt: { not: null },
};

export const federatedProfile: Prisma.ProfileWhereInput = {
  federatedStreaming: true,
};

export const federatedProfileAtSomePoint: Prisma.ProfileWhereInput = {
  federatedStreamingOptInDate: { not: null },
};

export const profileNoLongerFederated: Prisma.ProfileWhereInput = {
  AND: [federatedProfileAtSomePoint, { NOT: federatedProfile }],
};

// Profiles who opted in at some point but were deleted
export const profileFederatedButDeleted: Prisma.ProfileWhereInput = {
  AND: [federatedProfileAtSomePoint, profileDeleted],
};

export const profileOptedOutOrDeleted: Prisma.ProfileWhereInput = {
  OR: [profileNoLongerFederated, profileFederatedButDeleted],
  deletedAt: {}, // this is to avoid the middleware filtering out softDeleted -> /mirlo/prisma/prisma.ts
};

export const whereForVisibleProfile = (): Prisma.ProfileWhereInput => ({
  enabled: true,
  deletedAt: null,
});

export const findProfileIdForURLSlug = async (id: string | number) => {
  if (typeof id !== "number" && Number.isNaN(Number(id))) {
    const profile = await prisma.profile.findFirst({
      where: {
        urlSlug: { equals: id, mode: "insensitive" },
      },
    });
    id = `${profile?.id ?? id}`;
  }
  if (Number.isNaN(Number(id))) {
    return undefined;
  }
  return Number(id);
};

export const isProfileSlugTaken = async (
  urlSlug: string,
  excludeProfileId?: number
) => {
  const profile = await prisma.profile.findFirst({
    where: {
      urlSlug: { equals: urlSlug, mode: "insensitive" },
      ...(excludeProfileId ? { id: { not: excludeProfileId } } : {}),
    },
    select: { id: true },
  });
  if (profile) {
    return true;
  }
  if (!reservedProfileSlugs.includes(urlSlug.toLowerCase())) {
    return false;
  }
  const keepsOwnSlug =
    !!excludeProfileId &&
    !!(await prisma.profile.findFirst({
      where: {
        id: excludeProfileId,
        urlSlug: { equals: urlSlug, mode: "insensitive" },
      },
      select: { id: true },
    }));
  return !keepsOwnSlug;
};

export const asSlugConflictError = (e: unknown) =>
  e instanceof PrismaClientKnownRequestError && e.code === "P2002"
    ? new AppError({
        httpCode: 400,
        description: `"urlSlug" is already in use`,
      })
    : e;

export const generateUniqueProfileSlug = async (name: string) => {
  const base = generateSlug(name) || "artist";
  let candidate = base;
  for (let suffix = 2; await isProfileSlugTaken(candidate); suffix++) {
    candidate = `${base}-${suffix}`;
  }
  return candidate;
};

export const createProfileForUser = async (
  user: Pick<Express.User, "id" | "isLabelAccount">,
  { name, bio, urlSlug }: { name: string; bio?: string; urlSlug: string }
) => {
  const settings = await getSiteSettings();
  return prisma.profile.create({
    data: {
      name,
      bio,
      urlSlug,
      user: { connect: { id: user.id } },
      properties: {
        colors: settings.settings?.instanceCustomization?.colors ?? {
          button: "#be3455",
          buttonText: "#ffc0cb",
          background: "#f5f0f0",
          text: "#111",
        },
      },
      subscriptionTiers: {
        create: {
          name: "follow",
          description: "follow an artist",
          minAmount: 0,
          isDefaultTier: true,
        },
      },
      ...(user.isLabelAccount && {
        artistLabels: {
          create: {
            labelUserId: user.id,
            isLabelApproved: true,
            canLabelManageArtist: true,
            canLabelAddReleases: true,
            isArtistApproved: true,
            isDisplayedOnArtistPage: true,
          },
        },
      }),
    },
    include: { artistLabels: true },
  });
};

export const createSubscriptionConfirmation = async (
  email: string,
  profile: Profile,
  message?: string
) => {
  try {
    const subscriptionConfirmation =
      await prisma.profileUserSubscriptionConfirmation.create({
        data: {
          message,
          email: email,
          profileId: profile.id,
        },
      });

    return sendMailQueue.add("send-mail", {
      template: "artist-subscription-confirmation",
      message: {
        to: email,
      },
      locals: {
        artist: serializeProfile(profile),
        email,
        token: subscriptionConfirmation.token,
        host: process.env.API_DOMAIN,
        client: (await getClient()).applicationUrl,
      },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      // skip
      // FIXME: what should we do when a user already exists?
      logger.info("Had an error", e);
    } else {
      throw e;
    }
  }
};

export const subscribeUserToProfile = async (
  profile: {
    user: SafeUser;
    userId: number;
    subscriptionTiers: ProfileSubscriptionTier[];
    id: number;
  },
  user?: { id: number } | null,
  message?: string | null
) => {
  let defaultTier = profile.subscriptionTiers.find(
    (tier) => tier.isDefaultTier
  );

  if (!defaultTier) {
    defaultTier = await prisma.profileSubscriptionTier.create({
      data: {
        name: "follow",
        description: "follow an artist",
        minAmount: 0,
        isDefaultTier: true,
        profileId: profile.id,
      },
    });
  }

  if (user && defaultTier) {
    const isSubscribed = await prisma.profileUserSubscription.findFirst({
      where: {
        userId: user.id,
        message,
        profileSubscriptionTier: {
          profileId: profile.id,
        },
      },
    });
    if (!isSubscribed) {
      await prisma.profileUserSubscription.upsert({
        create: {
          profileSubscriptionTierId: defaultTier.id,
          userId: user.id,
          amount: 0,
        },
        update: {
          deletedAt: null,
        },
        where: {
          userId_profileSubscriptionTierId: {
            userId: user.id,
            profileSubscriptionTierId: defaultTier.id,
          },
        },
      });
    }
    await prisma.notification.create({
      data: {
        notificationType: "USER_FOLLOWED_YOU",
        userId: profile.userId,
        profileId: profile.id,
        relatedUserId: user.id,
      },
    });
  }

  const subscriptions = await prisma.profileUserSubscription.findMany({
    where: {
      userId: user?.id,
      profileSubscriptionTier: {
        profileId: profile.id,
      },
    },
  });

  return subscriptions;
};

export const deleteProfile = async (userId: number, profileId: number) => {
  await prisma.profile.update({
    where: {
      id: profileId,
      userId,
    },
    data: {
      urlSlug: `deleted-${profileId}`,
    },
  });
  await prisma.profile.deleteMany({
    where: {
      id: profileId,
      userId,
    },
  });

  // FIXME: We don't do cascading deletes because of the
  // soft deletion. That _could_ probably be put into a
  // a prisma middleware. This is a lot!
  // https://github.com/funmusicplace/mirlo/issues/19
  await prisma.post.deleteMany({
    where: {
      profileId: Number(profileId),
    },
  });

  await deleteStripeSubscriptions({
    profileSubscriptionTier: { profileId: Number(profileId) },
  });

  await prisma.profileSubscriptionTier.deleteMany({
    where: {
      profileId: Number(profileId),
    },
  });

  await prisma.profileUserSubscription.deleteMany({
    where: {
      profileSubscriptionTier: { profileId: Number(profileId) },
    },
  });

  const merch = await prisma.merch.findMany({
    where: {
      profileId: Number(profileId),
    },
  });

  await Promise.all(merch.map((m) => deleteMerch(m.id)));

  const trackGroups = await prisma.trackGroup.findMany({
    where: {
      profileId: Number(profileId),
    },
  });

  await Promise.all(trackGroups.map((tg) => deleteTrackGroup(tg.id, true)));

  await prisma.artistLabel.deleteMany({
    where: {
      artistId: Number(profileId),
    },
  });

  await prisma.profileManager.deleteMany({
    where: { profileId: Number(profileId) },
  });
};

export const deleteProfileImage = async (
  profileId: number,
  field: "avatar" | "background"
) => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { avatar: true, background: true },
  });
  const image = profile?.[field];

  if (image) {
    await deleteStoredImage(image);
  }
};

export const deleteStripeSubscriptions = async (
  where: Prisma.ProfileUserSubscriptionWhereInput
) => {
  const stripeSubscriptions = await prisma.profileUserSubscription.findMany({
    where,
    include: {
      profileSubscriptionTier: true,
    },
  });
  await Promise.all(
    stripeSubscriptions.map(async (sub) => {
      if (sub.stripeSubscriptionKey) {
        const profileOwner = await prisma.user.findFirst({
          where: {
            profiles: {
              some: {
                id: sub.profileSubscriptionTier.profileId,
              },
            },
          },
        });
        try {
          if (profileOwner?.stripeAccountId) {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionKey, {
              stripeAccount: profileOwner?.stripeAccountId,
            });
          } else {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionKey);
          }
        } catch (e) {
          console.error("Fail silently on deleting from stripe", e);
        }
      }
    })
  ).catch((e) => {
    console.error("truely a failure");
  });
};

export const sendSubscriptionCancellationEmail = async (
  email: string,
  profile: Profile,
  endsAt: Date | null,
  cancelledByArtist: boolean = false
) => {
  return sendMailQueue.add("send-mail", {
    template: "artist-subscription-cancelled",
    message: {
      to: email,
    },
    locals: {
      artist: serializeProfile(profile),
      email,
      endsAt: endsAt ? endsAt.toISOString() : null,
      cancelledByArtist,
      host: process.env.API_DOMAIN,
      client: (await getClient()).applicationUrl,
    },
  });
};

/**
 * Common includes when returning a single artist
 */
export const singleInclude = (queryOptions?: {
  includeDefaultTier?: boolean;
  includePrivate?: boolean;
  loggedInUserId?: number;
}): Prisma.ProfileInclude<DefaultArgs> & {
  merch: { include: { images: typeof merchImagesInclude } };
} => {
  const { includeDefaultTier, includePrivate, loggedInUserId } =
    queryOptions ?? {};
  return {
    trackGroups: {
      where: {
        ...trackGroupPublishedObject(),
        ...(includePrivate ? {} : { isPublic: true }),
      },
      orderBy: [
        {
          orderIndex: "asc",
        },
        { releaseDate: "desc" },
      ],
      include: {
        tracks: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
        },
        cover: true,
        fundraiser: true,
        paymentToUser: {
          select: { currency: true },
        },
        _count: subscriptionTierReleasesCount,
      },
    },
    tourDates: true,
    background: true,
    avatar: true,
    merch: {
      where: {
        isPublic: true,
        deletedAt: null,
      },
      orderBy: [
        { order: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
      include: {
        images: merchImagesInclude,
        includePurchaseTrackGroup: true,
      },
    },
    subscriptionTiers: {
      where: {
        deletedAt: null,
        isDefaultTier: includeDefaultTier ? undefined : false,
      },
      orderBy: subscriptionTierOrderBy,
      include: {
        images: {
          where: {
            image: {
              deletedAt: null,
            },
          },
          include: {
            image: true,
          },
        },
        releases: {
          where: {
            trackGroup: {
              deletedAt: null,
            },
          },
          orderBy: [
            { order: { sort: "asc", nulls: "last" } },
            { trackGroup: { releaseDate: "desc" } },
          ],
          select: {
            trackGroup: {
              select: {
                cover: true,
                id: true,
                title: true,
                urlSlug: true,
                isGettable: true,
                isPublic: true,
                isPreorder: true,
                publishedAt: true,
                releaseDate: true,
                minPrice: true,
                fundraiserId: true,
                fundraiser: true,
                paymentToUser: { select: { currency: true } },
                _count: subscriptionTierReleasesCount,
                tracks: {
                  where: { deletedAt: null, audio: { uploadState: "SUCCESS" } },
                  orderBy: { order: "asc" },
                  select: { id: true, order: true, isPreview: true },
                },
                ...(loggedInUserId
                  ? {
                      userTrackGroupPurchases: {
                        where: { userId: loggedInUserId },
                        select: { userId: true },
                      },
                    }
                  : {}),
                profile: {
                  select: {
                    name: true,
                    id: true,
                    urlSlug: true,
                    user: { select: { currency: true } },
                  },
                },
              },
            },
          },
        },
      },
    },
    artistLabels: {
      include: {
        labelUser: {
          select: {
            id: true,
            name: true,
            urlSlug: true,
            ...(includePrivate ? { email: true } : {}),
            profiles: {
              where: {
                isLabelProfile: true,
              },
            },
          },
        },
      },
    },
    profileLocationTags: {
      include: {
        locationTag: true,
      },
    },
    posts: {
      where: {
        publishedAt: {
          lte: new Date(),
        },
        deletedAt: null,
        isDraft: false,
      },
      orderBy: {
        publishedAt: "desc",
      },
      include: {
        featuredImage: true,
        images: postImagesForContent,
      },
    },
    user: {
      select: {
        currency: true,
        artistLabels: {
          where: {
            isLabelApproved: true,
            isArtistApproved: true,
            artist: { deletedAt: null },
          },
          orderBy: [{ orderIndex: { sort: "asc", nulls: "last" } }],
          include: {
            artist: {
              include: {
                avatar: true,
                background: true,
                trackGroups: {
                  where: whereForPublishedTrackGroups(),
                  include: {
                    cover: true,
                    tracks: true,
                  },
                  orderBy: { releaseDate: "desc" },
                  take: 4,
                },
              },
            },
          },
        },
      },
    },
  } as any;
};

export const addSizesToImage = (
  prefix: string,
  image?: { url: string[]; updatedAt?: Date | string } | null
) => {
  if (!image) {
    return null;
  }

  const sizes = convertURLArrayToSizes(image.url, prefix) as Record<
    string,
    string
  >;

  // Re-uploading an image reuses the same object key, so its URLs never change
  // and browsers/the CDN keep serving the previous file. Stamping the record's
  // updatedAt onto each size gives every upload a distinct URL, without
  // touching storage or invalidating anything. See #2362 and #2377.
  const version = image.updatedAt
    ? new Date(image.updatedAt).getTime()
    : undefined;

  if (!version) {
    return { ...image, sizes };
  }

  const versionedSizes = Object.keys(sizes).reduce<Record<string, string>>(
    (aggr, size) => {
      aggr[size] = `${sizes[size]}?${version}`;
      return aggr;
    },
    {}
  );

  return { ...image, sizes: versionedSizes };
};

export const addSizesToStoredImage = <
  T extends {
    url: string[];
    updatedAt?: Date | string;
    keyPrefix: string | null;
  },
>(
  image?: T | null
) => (image ? addSizesToImage(storedImagePrefix(image), image) : null);

export const resolveProfileImageUrl = (artist: {
  avatar?: { url: string[]; keyPrefix: string | null } | null;
  background?: { url: string[]; keyPrefix: string | null } | null;
  trackGroups?: Array<{
    cover?: { url: string[]; keyPrefix: string | null } | null;
  }>;
}): string | undefined =>
  storedImageVariantUrl(artist.avatar, 600) ??
  storedImageVariantUrl(artist.background, 625) ??
  storedImageVariantUrl(artist.trackGroups?.[0]?.cover, 600);

/**
 * Artist-named aliases kept so callers can migrate to the profile naming a
 * domain at a time. Removed once nothing imports them.
 */
export const confirmArtistIdExists = confirmProfileIdExists;
export const getPlatformFeeForArtist = getPlatformFeeForProfile;
export const artistDeleted = profileDeleted;
export const federatedArtist = federatedProfile;
export const federatedArtistAtSomePoint = federatedProfileAtSomePoint;
export const artistNoLongerFederated = profileNoLongerFederated;
export const artistFederatedButDeleted = profileFederatedButDeleted;
export const artistOptedOutOrDeleted = profileOptedOutOrDeleted;
export const findArtistIdForURLSlug = findProfileIdForURLSlug;
export const subscribeUserToArtist = subscribeUserToProfile;
export const deleteArtist = deleteProfile;
export { processSingleArtist } from "../serializers/artist";
