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
