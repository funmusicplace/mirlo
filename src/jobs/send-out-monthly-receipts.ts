import prisma from "@mirlo/prisma";
import sendMail from "./send-mail";

import logger from "../logger";
import { groupBy } from "lodash";
import { Job } from "bullmq";

const sendOutMonthlyReceipts = async () => {
  try {
    logger.info("Starting to send out monthly receipts");
    const allSubscriptions = await prisma.artistUserSubscription.findMany({
      where: {
        amount: {
          gt: 0,
        },
        deletedAt: null,
        artistSubscriptionTier: {
          isDefaultTier: false,
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

    const groupedSubscriptions = groupBy(allSubscriptions, "userId");

    await Promise.all(
      Object.keys(groupedSubscriptions).map(async (userId) => {
        const userSubscriptions = groupedSubscriptions[userId];
        if (groupedSubscriptions[userId].length > 0) {
          logger.info(
            `user ${userId} subscribes to ${userSubscriptions.length} artists`
          );

          return sendMail({
            data: {
              template: "announce-monthly-receipts",
              message: {
                to: userSubscriptions[0].user.email,
              },
              locals: {
                userSubscriptions,
                user: userSubscriptions[0].user,
                host: process.env.API_DOMAIN,
                client: process.env.REACT_APP_CLIENT_DOMAIN,
              },
            },
          } as Job);
        }
      })
    );
  } catch (error) {
    logger.error("Error sending out monthly receipts", error);
    throw error;
  }
};

export default sendOutMonthlyReceipts;
