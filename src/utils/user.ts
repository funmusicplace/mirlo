import { User } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { deleteArtist } from "./artist";
import stripe from "./stripe";

export const deleteUser = async (userId: number) => {
  const userArtists = await prisma.artist.findMany({
    where: { userId: Number(userId) },
  });
  await Promise.all(
    userArtists.map((artist) => deleteArtist(Number(userId), artist.id))
  );

  const stripeSubscriptions = await prisma.artistUserSubscription.findMany({
    where: { userId: userId },
  });
  await Promise.all(
    stripeSubscriptions.map(async (sub) => {
      if (sub.stripeSubscriptionKey) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionKey);
      }
    })
  );
  await prisma.artistUserSubscription.deleteMany({
    where: {
      userId: userId,
    },
  });
  await prisma.user.delete({ where: { id: userId } });
};
