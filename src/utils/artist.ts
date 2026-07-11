import prisma from "@mirlo/prisma";
import {
  User,
  ProfileSubscriptionTier,
  Profile,
  Prisma,
} from "@mirlo/prisma/client";
import {
  DefaultArgs,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import { Job } from "bullmq";
import { NextFunction, Request, Response } from "express";

import sendMail from "../jobs/send-mail";
import logger from "../logger";

import { AppError } from "./error";
import { getClient } from "./getClient";
import { convertURLArrayToSizes } from "./images";
import { deleteMerch } from "./merch";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalUserAvatarBucket,
  removeObjectsFromBucket,
} from "./minio";
import { getSiteSettings } from "./settings";
import stripe from "./stripe";
import {
  deleteTrackGroup,
  trackGroupPublishedObject,
  whereForPublishedTrackGroups,
} from "./trackGroup";
export { processSingleProfile } from "./serialize/artist";

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
      name: "Profile ID must be valid number",
      httpCode: 400,
      description: "Profile ID must be valid number",
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

export const whereForAllProfilesThisLabelCanEdit = (
  userId: number
): Prisma.ProfileWhereInput => ({
  OR: [
    { userId },
    {
      artistLabels: {
        some: {
          labelUserId: userId,
          canLabelManageArtist: true,
        },
      },
    },
  ],
});

export const whereForAllProfilesThisLabelCanAddReleasesFor = (
  userId: number
): Prisma.ProfileWhereInput => ({
  OR: [
    { userId },
    {
      artistLabels: {
        some: {
          labelUserId: userId,
          canLabelAddReleases: true,
        },
      },
    },
  ],
});

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

export const createProfileSubscriptionConfirmation = async (
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

    return sendMail({
      data: {
        template: "artist-subscription-confirmation",
        message: {
          to: email,
        },
        locals: {
          artist: profile,
          email,
          token: subscriptionConfirmation.token,
          host: process.env.API_DOMAIN,
          client: (await getClient()).applicationUrl,
        },
      },
    } as Job);
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
    user: User;
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

  await Promise.all(trackGroups.map((tg) => deleteTrackGroup(tg.id)));

  await prisma.artistLabel.deleteMany({
    where: {
      artistId: Number(profileId),
    },
  });
};

export const deleteProfileAvatar = async (profileId: number) => {
  const avatar = await prisma.profileAvatar.findFirst({
    where: {
      profileId,
    },
  });

  if (avatar) {
    await prisma.profileAvatar.delete({
      where: {
        profileId,
      },
    });

    try {
      removeObjectsFromBucket(finalArtistAvatarBucket, avatar.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
  }
};

export const deleteUserAvatar = async (userId: number) => {
  const avatar = await prisma.userAvatar.findFirst({
    where: {
      userId,
    },
  });

  if (avatar) {
    await prisma.userAvatar.delete({
      where: {
        userId,
      },
    });

    try {
      removeObjectsFromBucket(finalUserAvatarBucket, avatar.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
  }
};

export const deleteProfileBackground = async (profileId: number) => {
  const background = await prisma.profileBackground.findFirst({
    where: {
      profileId,
    },
  });

  if (background) {
    await prisma.profileBackground.delete({
      where: {
        profileId,
      },
    });

    try {
      removeObjectsFromBucket(finalArtistBackgroundBucket, background.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
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

// Sends the buyer confirmation that their subscription has been cancelled.
// For a paid subscription, `endsAt` is when access remains active until (the
// end of the period they already paid for); for a free/follow tier it is null
// and the cancellation is effective immediately.
export const sendProfileSubscriptionCancellationEmail = async (
  email: string,
  profile: Profile,
  endsAt: Date | null
) => {
  return sendMail({
    data: {
      template: "artist-subscription-cancelled",
      message: {
        to: email,
      },
      locals: {
        artist: profile,
        email,
        endsAt: endsAt ? endsAt.toISOString() : null,
        host: process.env.API_DOMAIN,
        client: (await getClient()).applicationUrl,
      },
    },
  } as Job);
};

/**
 * Common includes when returning a single artist
 */
export const singleInclude = (queryOptions?: {
  includeDefaultTier?: boolean;
  includePrivate?: boolean;
}): Prisma.ProfileInclude<DefaultArgs> & {
  merch: { include: { images: boolean } };
} => {
  const { includeDefaultTier, includePrivate } = queryOptions ?? {};
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
        cover: {
          where: {
            deletedAt: null,
          },
        },
        fundraiser: true,
        paymentToUser: {
          select: { currency: true },
        },
      },
    },
    tourDates: true,
    background: {
      where: {
        deletedAt: null,
      },
    },
    avatar: {
      where: {
        deletedAt: null,
      },
    },
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
        images: true,
        includePurchaseTrackGroup: true,
      },
    },
    subscriptionTiers: {
      where: {
        deletedAt: null,
        isDefaultTier: includeDefaultTier ? undefined : false,
      },
      orderBy: {
        minAmount: "asc",
      },
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
          select: {
            trackGroup: {
              select: {
                cover: true,
                id: true,
                title: true,
                urlSlug: true,
                profile: {
                  select: {
                    name: true,
                    id: true,
                    urlSlug: true,
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
            email: true,
            profiles: {
              where: {
                isLabelProfile: true,
              },
            },
            stripeAccountId: true,
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
                avatar: {
                  where: { deletedAt: null },
                },
                background: {
                  where: { deletedAt: null },
                },
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
  bucket: string,
  image?: { url: string[]; profileId?: number; [key: string]: unknown } | null
) => {
  if (!image) {
    return null;
  }
  const { profileId, ...imageRest } = image;
  return {
    ...imageRest,
    ...(profileId !== undefined ? { artistId: profileId } : {}),
    sizes: convertURLArrayToSizes(image.url, bucket),
  };
};
