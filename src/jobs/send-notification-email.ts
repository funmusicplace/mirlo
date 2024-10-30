import prisma from "@mirlo/prisma";
import logger from "../logger";
import { sendMailQueue, sendMailQueueEvents } from "../queues/send-mail-queue";

const sendNotificationEmail = async () => {
  logger.info(`sendNotificationEmail: sending notifications`);

  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: {
        lte: new Date(),
      },
      notificationType: "NEW_ARTIST_POST",
    },
    include: {
      post: {
        include: {
          artist: true,
        },
      },
      trackGroup: {
        include: {
          artist: true,
        },
      },
      user: true,
    },
  });

  logger.info(
    `sendNotificationEmail: found ${notifications.length} notifications to send out`
  );

  try {
    for await (const notification of notifications) {
      logger.info(
        `sendNotificationEmail: checking for notification ${notification.id}`
      );
      if (
        notification.notificationType === "NEW_ARTIST_POST" &&
        notification.post?.artist
      ) {
        if (!notification.post.shouldSendEmail) {
          logger.info(
            `sendNotificationEmail: post asked not to be emailed: ${notification.post.title} to ${notification.user.email}`
          );
          await prisma.notification.update({
            where: {
              id: notification.id,
            },
            data: {
              isRead: true,
            },
          });
          logger.info(`sendNotificationEmail: updated notification`);
        } else {
          logger.info(
            `sendNotificationEmail: sending to queue notification for: ${notification.post.title} to ${notification.user.email}`
          );
          try {
            await sendMailQueue.add("send-mail", {
              template: "announce-post-published",
              message: {
                to: notification.user.email,
              },
              locals: {
                artist: notification.post.artist,
                post: {
                  ...notification.post,
                  htmlContent: notification.post.content,
                },
                email: notification.user.email,
                host: process.env.API_DOMAIN,
                client: process.env.REACT_APP_CLIENT_DOMAIN,
              },
            });

            await prisma.notification.update({
              where: {
                id: notification.id,
              },
              data: {
                isRead: true,
              },
            });
            logger.info(`sendNotificationEmail: updated notification`);
          } catch (e) {
            logger.error(
              `sendNotificationEmail: failed to send to queue notification ${notification.id} to ${notification.user.email}`
            );
            logger.error(e);
          }
        }
      }
    }
  } catch (e) {
    logger.error(`sendNotificationEmail: failed to send out all notifications`);
    logger.error(e);
  } finally {
    logger.info(`sendNotificationEmail: closing queue`);

    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  }
};

export default sendNotificationEmail;
