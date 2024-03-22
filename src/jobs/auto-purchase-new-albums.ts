import prisma from "../../prisma/prisma";
import sendMail from "./send-mail";

import logger from "../logger";
import { registerPurchase } from "../utils/trackGroup";

const autoPurchaseNewAlbums = async () => {
  const currentDate = new Date();
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(currentDate.getMinutes() - 10);

  const recentAlbums = await prisma.trackGroup.findMany({
    where: {
      releaseDate: {
        gte: tenMinutesAgo,
        lte: currentDate,
      },
      published: true,
      deletedAt: null,
    },
  });

  logger.info(`autoPurchaseNewAlbums: new albums: ${recentAlbums.length}`);

  await Promise.all(
    recentAlbums.map(async (album) => {
      const artistSubscribers = await prisma.artistUserSubscription.findMany({
        where: {
          amount: {
            gte: 0,
          },
          deletedAt: null,
          artistSubscriptionTier: {
            artistId: album.artistId,
            autoPurchaseAlbums: true,
          },
        },
        include: {
          artistSubscriptionTier: {
            include: {
              artist: true,
            },
          },
          user: true,
        },
        orderBy: {
          userId: "desc",
        },
      });

      logger.info(
        `autoPurchaseNewAlbums: album ${album.id}: found ${artistSubscribers.length} subscribers for album`
      );

      await Promise.all(
        artistSubscribers.map(async (sub) => {
          logger.info(
            `autoPurchaseNewAlbums: album ${album.id}: registering purchase for ${sub.userId}`
          );
          await registerPurchase({
            userId: sub.userId,
            trackGroupId: album.id,
            pricePaid: 0,
            currencyPaid: "usd",
            paymentProcessorKey: null,
          });

          return sendMail({
            data: {
              template: "automatically-received-album",
              message: {
                to: sub.user.email,
              },
              locals: {
                trackGroup: album,
                artist: sub.artistSubscriptionTier.artist,
                host: process.env.API_DOMAIN,
                client: process.env.REACT_APP_CLIENT_DOMAIN,
              },
            },
          });
        })
      );
    })
  );
};

export default autoPurchaseNewAlbums;
