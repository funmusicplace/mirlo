import prisma from "@mirlo/prisma";
import { Profile } from "@mirlo/prisma/client";

import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { getClient } from "../utils/getClient";

export type SubscriptionRenewalReminderEmailType = {
  interval: "MONTH" | "YEAR";
  artist: Profile & { user: { currency: string | null } };
  host: string;
  client: string;
  profileUserSubscription: {
    id: number;
    amount: number;
    profileSubscriptionTier: {
      name: string;
    };
    createdAt: Date;
    updatedAt: Date;
  };
  renewalDate: string;
};

/**
 * Send renewal reminders for subscriptions that will renew within 7-14 days
 * Only sends reminders for year-long subscriptions
 * Prevents duplicate reminders with a 30-day cooldown
 */
const sendSubscriptionRenewalReminders = async () => {
  try {
    logger.info("Starting to send subscription renewal reminders");

    // Calculate date range for reminders: 7 to 14 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    // Calculate cutoff date: only send if reminder was never sent before,
    // or if it's been more than 30 days (ensures once per year)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find subscriptions that are about to renew
    const subscriptionsToRemind = await prisma.profileUserSubscription.findMany(
      {
        where: {
          amount: { gt: 0 },
          deletedAt: null,
          // Skip subscriptions the user has cancelled but that are still running
          // out their paid period — they won't renew, so don't remind.
          deleteReason: null,
          profileSubscriptionTier: {
            isDefaultTier: false,
            interval: "YEAR", // Only year-long subscriptions
          },
          nextBillingDate: {
            gte: sevenDaysFromNow,
            lte: fourteenDaysFromNow,
          },
          // Only send if: never sent before, OR last sent more than 30 days ago
          // This ensures one reminder per subscription per year
          OR: [
            { renewalReminderSentAt: null },
            { renewalReminderSentAt: { lt: thirtyDaysAgo } },
          ],
        },
        include: {
          user: true,
          profileSubscriptionTier: {
            include: {
              profile: {
                include: { user: { select: { currency: true } } },
              },
            },
          },
        },
      }
    );

    logger.info(
      `Found ${subscriptionsToRemind.length} subscriptions to remind about renewal`
    );

    // Send reminders and update timestamps
    await Promise.all(
      subscriptionsToRemind.map(async (subscription) => {
        try {
          const renewalDate = subscription.nextBillingDate
            ? new Date(subscription.nextBillingDate).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )
            : "unknown date";

          // Queue the email job
          await sendMailQueue.add("send-mail", {
            template: "subscription-renewal-reminder",
            message: {
              to: subscription.user.email,
            },
            locals: {
              interval: subscription.profileSubscriptionTier.interval,
              artist: subscription.profileSubscriptionTier.profile,
              profileUserSubscription: {
                id: subscription.id,
                amount: subscription.amount,
                profileSubscriptionTier: {
                  name: subscription.profileSubscriptionTier.name,
                },
                createdAt: subscription.createdAt,
                updatedAt: subscription.updatedAt,
              },
              host: process.env.API_DOMAIN,
              client: (await getClient()).applicationUrl,
              renewalDate,
            } as SubscriptionRenewalReminderEmailType,
          });

          // Update timestamp
          await prisma.profileUserSubscription.update({
            where: { id: subscription.id },
            data: { renewalReminderSentAt: new Date() },
          });

          logger.info(
            `Sent renewal reminder for subscription ${subscription.id} to ${subscription.user.email}`
          );
        } catch (error) {
          logger.error(
            `Error sending renewal reminder for subscription ${subscription.id}`,
            error
          );
        }
      })
    );
  } catch (error) {
    logger.error("Error sending subscription renewal reminders", error);
    throw error;
  }
};

export default sendSubscriptionRenewalReminders;
