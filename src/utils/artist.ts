import {
  User,
  ArtistUserSubscription,
  ArtistSubscriptionTier,
  Artist,
  Post,
  ArtistBanner,
  ArtistAvatar,
  TrackGroup,
  TrackGroupCover,
  Track,
  Prisma,
} from "@prisma/client";
import prisma from "../../prisma/prisma";
import stripe from "./stripe";
import trackGroupProcessor, { deleteTrackGroup } from "./trackGroup";
import postProcessor from "./post";
import { convertURLArrayToSizes } from "./images";
import { finalArtistAvatarBucket, finalArtistBannerBucket } from "./minio";
import { DefaultArgs } from "@prisma/client/runtime/library";

export const checkIsUserSubscriber = async (user: User, artistId: number) => {
  let userSubscriber = false;

  if (user) {
    const subscriber = await prisma.artistUserSubscription.findFirst({
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

export const findArtistIdForURLSlug = async (id: string) => {
  if (Number.isNaN(Number(id))) {
    const artist = await prisma.artist.findFirst({
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

export const subscribeUserToArtist = async (
  artist: { subscriptionTiers: ArtistSubscriptionTier[]; id: number },
  user?: User | null
) => {
  let defaultTier = artist.subscriptionTiers.find((tier) => tier.isDefaultTier);

  if (!defaultTier) {
    defaultTier = await prisma.artistSubscriptionTier.create({
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
    const isSubscribed = await prisma.artistUserSubscription.findFirst({
      where: {
        userId: user.id,
        artistSubscriptionTier: {
          artistId: artist.id,
        },
      },
    });
    if (!isSubscribed) {
      await prisma.artistUserSubscription.upsert({
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
  }

  const subscriptions = await prisma.artistUserSubscription.findMany({
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
  await prisma.artist.deleteMany({
    where: {
      id: Number(artistId),
      userId: Number(userId),
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

  await prisma.artistSubscriptionTier.deleteMany({
    where: {
      artistId: Number(artistId),
    },
  });
  await prisma.artistUserSubscription.deleteMany({
    where: {
      artistSubscriptionTier: { artistId: Number(artistId) },
    },
  });

  const trackGroups = await prisma.trackGroup.findMany({
    where: {
      artistId: Number(artistId),
    },
  });

  await Promise.all(trackGroups.map((tg) => deleteTrackGroup(tg.id)));
};

export const deleteStripeSubscriptions = async (
  where: { userId: number } | { artistSubscriptionTier: { artistId: number } }
) => {
  const stripeSubscriptions = await prisma.artistUserSubscription.findMany({
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
        if (artistUser?.stripeAccountId) {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionKey, {
            stripeAccount: artistUser?.stripeAccountId,
          });
        }
        await stripe.subscriptions.cancel(sub.stripeSubscriptionKey);
      }
    })
  );
};

export const singleInclude: Prisma.ArtistInclude<DefaultArgs> = {
  trackGroups: {
    where: {
      published: true,
      tracks: { some: { audio: { uploadState: "SUCCESS" } } },
    },
    orderBy: {
      releaseDate: "desc",
    },
    include: {
      tracks: {
        where: { deletedAt: null },
      },
      cover: true,
    },
  },
  banner: true,
  avatar: true,
  subscriptionTiers: {
    where: {
      deletedAt: null,
      isDefaultTier: false,
    },
    orderBy: {
      minAmount: "asc",
    },
  },
  posts: {
    where: {
      publishedAt: {
        lte: new Date(),
      },
      deletedAt: null,
    },
  },
};

interface LocalArtist extends Artist {
  posts: Post[];
  banner: ArtistBanner | null;
  avatar: ArtistAvatar | null;
  trackGroups: (TrackGroup & {
    cover?: TrackGroupCover | null;
    tracks?: Track[];
  })[];
}

export const processSingleArtist = (
  artist: LocalArtist,
  userId?: number,
  isUserSubscriber?: boolean
) => {
  return {
    ...artist,
    posts: artist?.posts.map((p: Post) =>
      postProcessor.single(p, isUserSubscriber || artist.userId === userId)
    ),
    banner: {
      ...artist?.banner,
      sizes:
        artist?.banner &&
        convertURLArrayToSizes(artist?.banner?.url, finalArtistBannerBucket),
    },
    avatar: {
      ...artist?.avatar,
      sizes:
        artist?.avatar &&
        convertURLArrayToSizes(artist?.avatar?.url, finalArtistAvatarBucket),
    },
    trackGroups: artist?.trackGroups.map(trackGroupProcessor.single),
  };
};
