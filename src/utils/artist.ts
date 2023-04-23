import { User } from "@prisma/client";
import prisma from "../../prisma/prisma";

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
