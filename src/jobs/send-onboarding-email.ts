import prisma from "@mirlo/prisma";

import logger from "../logger";
import { flatten, uniqBy } from "lodash";
import sendMail from "./send-mail";
import { sendMailQueue } from "../queues/send-mail-queue";

const sendOnboardingEmail = async () => {
  const date = new Date();

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      emailConfirmationToken: null,
      receivePlatformEmails: true,
      createdAt: {
        gt: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 14),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
      },
    },
    include: {
      artists: true,
    },
  });

  logger.info(`sendOnboardingEmail: found ${users.length} users`);

  try {
    await Promise.all(
      users.map(async (user) => {
        logger.info(
          `sendOnboardingEmail: determining what emails to send for for userID ${user.id}`
        );
        try {
          const twoDaysAgo = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - 1
          );
          console.log(
            "twoDaysAgo",
            user.lastOnboardingEmailSentAt,
            twoDaysAgo,
            user.lastOnboardingEmailSentAt
              ? user.lastOnboardingEmailSentAt > twoDaysAgo
              : undefined
          );

          if (
            user.lastOnboardingEmailSentAt &&
            user.lastOnboardingEmailSentAt > twoDaysAgo
          ) {
            logger.info(
              "sendOnboardingEmail: user already received onboarding email recently"
            );
            return;
          }

          if (
            user.artists.length > 0 &&
            user.stripeAccountId === null &&
            !user.onboardingEmailsSent.includes("payment-processor")
          ) {
            await sendMailQueue.add("send-mail", {
              template: "admin-announcement",
              message: {
                to: user.email,
              },
              locals: {
                user,
                content: `<p>Hi ${user.name || user.email},</p>
                <p>We noticed that you have created an artist profile on our platform but haven't set up a payment processor yet. To start receiving payments for your music, please set up your payment processor as soon as possible.</p>
                <p>If you have any questions or need assistance, feel free to reach out to us at hi@mirlo.space.</p>`,

                host: process.env.API_DOMAIN,
                client: process.env.REACT_APP_CLIENT_DOMAIN,
              },
            });
            await prisma.user.update({
              where: { id: user.id },
              data: {
                onboardingEmailsSent: {
                  push: "payment-processor",
                },
                lastOnboardingEmailSentAt: new Date(),
              },
            });
            logger.info(
              `sendOnboardingEmail: created payment processor notification for user ${user.id}`
            );
          }
        } catch (error) {
          logger.error(
            `sendOnboardingEmail: Failed to create notification for user ${user.id}`,
            error
          );
        }
      })
    );
  } catch (e) {
    console.error(e);
    logger.error(
      `sendOnboardingEmail: Failed to create notifications for onboarding emails`
    );
    logger.error(e);
  }
};

export default sendOnboardingEmail;
