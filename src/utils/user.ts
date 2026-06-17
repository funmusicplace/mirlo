import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

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
  userId?: string | number,
  /** Optional self-chosen display name. Only set when the user has none — never overwrites an existing name. */
  name?: string
) => {
  let newUser = false;
  let user: User | undefined | null;
  const trimmedName = name?.trim() || undefined;

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
          ...(trimmedName && { name: trimmedName }),
        },
      });
    }
    userId = `${user?.id}`;
  } else if (userId) {
    user = await prisma.user.findFirst({
      where: { id: Number(userId) },
    });
  }

  // Backfill a name for users who don't have one yet (a returning guest, or a
  // logged-in account created without a name). Never overwrite an existing name.
  if (user && trimmedName && !user.name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: trimmedName },
    });
  }

  return { userId, newUser, user };
};

export const findUserDiscountPercentsForArtist = async (
  userId: number,
  artistId: number
) => {
  const activeSubscriptions = await prisma.artistUserSubscription.findMany({
    where: {
      userId,
      deletedAt: null,
      artistSubscriptionTier: {
        artistId,
      },
    },
    select: {
      artistSubscriptionTier: {
        select: {
          digitalDiscountPercent: true,
          merchDiscountPercent: true,
        },
      },
    },
  });

  return activeSubscriptions.map((subscription) => ({
    digitalDiscountPercent:
      subscription.artistSubscriptionTier.digitalDiscountPercent ?? 0,
    merchDiscountPercent:
      subscription.artistSubscriptionTier.merchDiscountPercent ?? 0,
  }));
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
};
