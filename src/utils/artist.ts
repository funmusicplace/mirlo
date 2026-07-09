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
export { processSingleArtist } from "./serialize/artist";

type Params = {
  id: string;
};

export const confirmArtistIdExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: artistId } = req.params as unknown as Params;

  if (!artistId || Number.isNaN(artistId)) {
    const error = new AppError({
      name: "Artist ID must be valid number",
      httpCode: 400,
      description: "Artist ID must be valid number",
    });
    return next(error);
  }
  try {
    const artist = await prisma.profile.findFirst({
      where: {
        id: Number(artistId),
      },
      select: {
        id: true,
      },
    });
    if (!artist) {
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
  artistId?: number | null
) => {
  let userSubscriber = false;

  if (!artistId) {
    return true;
  }

  if (user) {
    const subscriber = await prisma.profileUserSubscription.findFirst({
      where: {
        userId: user.id,
        artistSubscriptionTier: {
          artistId,
        },
      },
    });

    userSubscriber = !!subscriber;
  }
  return userSubscriber;
};

export const getPlatformFeeForArtist = async (
  artistId: number | string | null
): Promise<number> => {
  const settings = await getSiteSettings();
  if (!artistId) {
    return settings.platformPercent;
  }

  const artist = await prisma.profile.findFirst({
    where: {
      id: Number(artistId),
    },
    select: {
      defaultPlatformFee: true,
    },
  });

  return artist?.defaultPlatformFee ?? settings.platformPercent;
};

export const whereForAllArtistsThisLabelCanEdit = (
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

export const whereForAllArtistsThisLabelCanAddReleasesFor = (
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

export const artistDeleted: Prisma.ProfileWhereInput = {
  deletedAt: { not: null },
};

export const federatedArtist: Prisma.ProfileWhereInput = {
  federatedStreaming: true,
};

export const federatedArtistAtSomePoint: Prisma.ProfileWhereInput = {
  federatedStreamingOptInDate: { not: null },
};

export const artistNoLongerFederated: Prisma.ProfileWhereInput = {
  AND: [federatedArtistAtSomePoint, { NOT: federatedArtist }],
};

// Artists who opted in at some point but were deleted
export const artistFederatedButDeleted: Prisma.ProfileWhereInput = {
  AND: [federatedArtistAtSomePoint, artistDeleted],
};

export const artistOptedOutOrDeleted: Prisma.ProfileWhereInput = {
  OR: [artistNoLongerFederated, artistFederatedButDeleted],
  deletedAt: {}, // this is to avoid the middleware filtering out softDeleted -> /mirlo/prisma/prisma.ts
};

export const findArtistIdForURLSlug = async (id: string | number) => {
  if (typeof id !== "number" && Number.isNaN(Number(id))) {
    const artist = await prisma.profile.findFirst({
      where: {
        urlSlug: { equals: id, mode: "insensitive" },
      },
    });
    id = `${artist?.id ?? id}`;
  }
  if (Number.isNaN(Number(id))) {
    return undefined;
  }
  return Number(id);
};

export const createSubscriptionConfirmation = async (
  email: string,
  artist: Profile,
  message?: string
) => {
  try {
    const subscriptionConfirmation =
      await prisma.profileUserSubscriptionConfirmation.create({
        data: {
          message,
          email: email,
          artistId: artist.id,
        },
      });

    return sendMail({
      data: {
        template: "artist-subscription-confirmation",
        message: {
          to: email,
        },
        locals: {
          artist,
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

export const subscribeUserToArtist = async (
  artist: {
    user: User;
    userId: number;
    subscriptionTiers: ProfileSubscriptionTier[];
    id: number;
  },
  user?: { id: number } | null,
  message?: string | null
) => {
  let defaultTier = artist.subscriptionTiers.find((tier) => tier.isDefaultTier);

  if (!defaultTier) {
    defaultTier = await prisma.profileSubscriptionTier.create({
      data: {
        name: "follow",
        description: "follow an artist",
        minAmount: 0,
        isDefaultTier: true,
        artistId: artist.id,
      },
    });
  }

  if (user && defaultTier) {
    const isSubscribed = await prisma.profileUserSubscription.findFirst({
      where: {
        userId: user.id,
        message,
        artistSubscriptionTier: {
          artistId: artist.id,
        },
      },
    });
    if (!isSubscribed) {
      await prisma.profileUserSubscription.upsert({
        create: {
          artistSubscriptionTierId: defaultTier.id,
          userId: user.id,
          amount: 0,
        },
        update: {
          deletedAt: null,
        },
        where: {
          userId_artistSubscriptionTierId: {
            userId: user.id,
            artistSubscriptionTierId: defaultTier.id,
          },
        },
      });
    }
    await prisma.notification.create({
      data: {
        notificationType: "USER_FOLLOWED_YOU",
        userId: artist.userId,
        artistId: artist.id,
        relatedUserId: user.id,
      },
    });
  }

  const subscriptions = await prisma.profileUserSubscription.findMany({
    where: {
      userId: user?.id,
      artistSubscriptionTier: {
        artistId: artist.id,
      },
    },
  });

  return subscriptions;
};

export const deleteArtist = async (userId: number, artistId: number) => {
  await prisma.profile.update({
    where: {
      id: artistId,
      userId,
    },
    data: {
      urlSlug: `deleted-${artistId}`,
    },
  });
  await prisma.profile.deleteMany({
    where: {
      id: artistId,
      userId,
    },
  });

  // FIXME: We don't do cascading deletes because of the
  // soft deletion. That _could_ probably be put into a
  // a prisma middleware. This is a lot!
  // https://github.com/funmusicplace/mirlo/issues/19
  await prisma.post.deleteMany({
    where: {
      artistId: Number(artistId),
    },
  });

  await deleteStripeSubscriptions({
    artistSubscriptionTier: { artistId: Number(artistId) },
  });

  await prisma.profileSubscriptionTier.deleteMany({
    where: {
      artistId: Number(artistId),
    },
  });

  await prisma.profileUserSubscription.deleteMany({
    where: {
      artistSubscriptionTier: { artistId: Number(artistId) },
    },
  });

  const merch = await prisma.merch.findMany({
    where: {
      artistId: Number(artistId),
    },
  });

  await Promise.all(merch.map((m) => deleteMerch(m.id)));

  const trackGroups = await prisma.trackGroup.findMany({
    where: {
      artistId: Number(artistId),
    },
  });

  await Promise.all(trackGroups.map((tg) => deleteTrackGroup(tg.id)));

  await prisma.artistLabel.deleteMany({
    where: {
      artistId: Number(artistId),
    },
  });
};

export const deleteArtistAvatar = async (artistId: number) => {
  const avatar = await prisma.artistAvatar.findFirst({
    where: {
      artistId,
    },
  });

  if (avatar) {
    await prisma.profileAvatar.delete({
      where: {
        artistId,
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

export const deleteArtistBackground = async (artistId: number) => {
  const background = await prisma.artistBackground.findFirst({
    where: {
      artistId,
    },
  });

  if (background) {
    await prisma.profileBackground.delete({
      where: {
        artistId,
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
      artistSubscriptionTier: true,
    },
  });
  await Promise.all(
    stripeSubscriptions.map(async (sub) => {
      if (sub.stripeSubscriptionKey) {
        const artistUser = await prisma.user.findFirst({
          where: {
            artists: {
              some: {
                id: sub.artistSubscriptionTier.artistId,
              },
            },
          },
        });
        try {
          if (artistUser?.stripeAccountId) {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionKey, {
              stripeAccount: artistUser?.stripeAccountId,
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
export const sendSubscriptionCancellationEmail = async (
  email: string,
  artist: Profile,
  endsAt: Date | null
) => {
  return sendMail({
    data: {
      template: "artist-subscription-cancelled",
      message: {
        to: email,
      },
      locals: {
        artist,
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
                artist: {
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
            artists: {
              where: {
                isLabelProfile: true,
              },
            },
            stripeAccountId: true,
          },
        },
      },
    },
    artistLocationTags: {
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
  image?: { url: string[] } | null
) => {
  return image
    ? {
        ...image,
        sizes: image && convertURLArrayToSizes(image?.url, bucket),
      }
    : null;
};
