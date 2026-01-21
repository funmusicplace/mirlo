import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

import logger from "../logger";
import { deleteArtist, deleteStripeSubscriptions } from "./artist";
import countries from "./country-codes-currencies";

import { v4 as uuid } from "uuid";

const anonymiseDeletedUser = async (userId: number) => {
  // Currently this means:
  // replace the email address with a randomstring@deleted (the @deleted is important)
  // clear name, and all stripe related info
  const scrambledEmail = uuid() + "@deleted";
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: null,
      email: scrambledEmail,
      stripeCustomerId: null,
      stripeAccountId: null
    }
  });
}

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

  // The User object will be retained, so we scramble the email and remove other
  // personal identifiers.
  await anonymiseDeletedUser(userId);
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
  let user: User | undefined | null;

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

export const cleanUpDeletedUsers = async () => {
  const candidates = await prisma.user.findMany(
    {
      where: {
        deletedAt: {
          not: null
        }
      }
    }
  );

  for (const candidate of candidates) {
    if (!candidate.email.endsWith("@deleted")) {
      await anonymiseDeletedUser(candidate.id);
    }
  }
};