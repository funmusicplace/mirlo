import prisma from "@mirlo/prisma";
import logger from "../logger";
import { deleteArtist, deleteStripeSubscriptions } from "./artist";
import countries from "./country-codes-currencies";

export const deleteUser = async (userId: number) => {
  const userArtists = await prisma.artist.findMany({
    where: { userId: Number(userId) },
  });
  await Promise.all(
    userArtists.map((artist) => deleteArtist(Number(userId), artist.id))
  );

  await deleteStripeSubscriptions({ userId });

  await prisma.artistUserSubscription.deleteMany({
    where: {
      userId: userId,
    },
  });
  await prisma.user.delete({ where: { id: userId } });
};

export const findUserIdForURLSlug = async (id: string) => {
  if (Number.isNaN(Number(id))) {
    const user = await prisma.user.findFirst({
      where: {
        urlSlug: { equals: id, mode: "insensitive" },
      },
    });
    id = `${user?.id ?? id}`;
  }
  if (Number.isNaN(Number(id))) {
    return undefined;
  }
  return Number(id);
};

export const getUserCurrencyString = async (userId: number) => {
  const userForCurrency = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      currency: true,
    },
  });

  const currencyString = userForCurrency?.currency ?? "usd";

  return currencyString;
};

export const getUserCountry = async (userId: number) => {
  const currencyString = await getUserCurrencyString(userId);
  const country = countries.find(
    (country) => country.currencyCode.toLowerCase() === currencyString
  );
  return country;
};

export const findOrCreateUserBasedOnEmail = async (
  userEmail: string,
  userId?: string | number
) => {
  let newUser = false;
  let user;

  if (!userId && userEmail) {
    newUser = true; // If this is true the user wasn't logged in when making the purchase
    user = await prisma.user.findFirst({
      where: {
        email: userEmail,
      },
    });
    if (!user) {
      logger.info(`Creating a new user for ${userEmail}`);
      user = await prisma.user.create({
        data: {
          email: userEmail,
        },
      });
    }
    userId = `${user?.id}`;
  } else if (userId) {
    user = await prisma.user.findFirst({
      where: { id: Number(userId) },
    });
  }
  return { userId, newUser, user };
};

export const updateCurrencies = async (userId: number, currency: string) => {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      currency,
    },
  });

  await prisma.trackGroup.updateMany({
    where: {
      OR: [{ paymentToUserId: userId }, { artist: { userId } }],
    },
    data: {
      currency,
    },
  });

  await prisma.merch.updateMany({
    where: {
      artist: {
        userId,
      },
    },
    data: {
      currency,
    },
  });

  await prisma.merchShippingDestination.updateMany({
    where: {
      merch: {
        artist: {
          userId,
        },
      },
    },
    data: {
      currency,
    },
  });

  await prisma.track.updateMany({
    where: {
      trackGroup: {
        artist: {
          userId,
        },
      },
    },
    data: {
      currency,
    },
  });

  await prisma.artistSubscriptionTier.updateMany({
    where: {
      artist: {
        userId,
      },
    },
    data: {
      currency,
    },
  });

  await prisma.artistTipTier.updateMany({
    where: {
      artist: {
        userId,
      },
    },
    data: {
      currency,
    },
  });
};
