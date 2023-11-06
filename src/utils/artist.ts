import { User, ArtistUserSubscription } from "@prisma/client";
import prisma from "../../prisma/prisma";
import stripe from "./stripe";
import { deleteTrackGroup } from "./trackGroup";

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
