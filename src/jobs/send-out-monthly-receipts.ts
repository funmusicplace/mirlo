import prisma from "@mirlo/prisma";
import { groupBy } from "lodash";

import logger from "../logger";
import { BULK_MAIL_PRIORITY, sendMailQueue } from "../queues/send-mail-queue";
import { serializeProfileUserSubscription } from "../serializers/profileUserSubscription";
import { getClient } from "../utils/getClient";

export type AnnounceMonthlyReceiptsEmailType = {
  userSubscriptions: {
    amount: number;
    artistSubscriptionTier: { artistId: number; artist: { name: string } };
  }[];
  user: {
    id: number;
    email: string;
  };
  host: string;
  client: string;
};

const sendOutMonthlyReceipts = async () => {
  try {
    logger.info("Starting to send out monthly receipts");
    const allSubscriptions = await prisma.profileUserSubscription.findMany({
      where: {
        amount: {
          gt: 0,
        },
        deletedAt: null,
        profileSubscriptionTier: {
          isDefaultTier: false,
          interval: "MONTH",
        },
      },
      include: {
        profileSubscriptionTier: {
          include: {
            profile: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
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

          return sendMailQueue.add(
            "send-mail",
            {
              template: "announce-monthly-receipts",
              message: {
                to: userSubscriptions[0].user.email,
              },
              locals: {
                userSubscriptions: userSubscriptions.map((sub) =>
                  serializeProfileUserSubscription(sub)
                ),
                user: userSubscriptions[0].user,
                host: process.env.API_DOMAIN || "",
                client: (await getClient()).applicationUrl,
              } satisfies AnnounceMonthlyReceiptsEmailType,
            },
            { priority: BULK_MAIL_PRIORITY }
          );
        }
      })
    );
  } catch (error) {
    logger.error("Error sending out monthly receipts", error);
    throw error;
  }
};

export default sendOutMonthlyReceipts;
