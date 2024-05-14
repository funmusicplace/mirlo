import prisma from "@mirlo/prisma";
import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";

const sendNotificationEmail = async () => {
  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: {
        lte: new Date(),
      },
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
      if (
        notification.notificationType === "NEW_ARTIST_POST" &&
        notification.post?.artist
      ) {
        if (!notification.post.shouldSendEmail) {
          logger.info(
            `sendNotificationEmail: post asked not to be emailed: ${notification.post.title} to ${notification.user.email}`
          );
          return;
        } else {
          logger.info(
            `sendNotificationEmail: mailing notification for: ${notification.post.title} to ${notification.user.email}`
          );
          try {
            sendMailQueue.add("send-mail", {
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
          } catch (e) {
            logger.error(
              `failed to send e-mail of notification ${notification.id} to ${notification.user.email}`
            );
            logger.error(e);
          }
        }
        await prisma.notification.update({
          where: {
            id: notification.id,
          },
          data: {
            isRead: true,
          },
        });
        logger.info(`sendNotificationEmail: updated notification`);
      }
    }
  } catch (e) {
    logger.error(`failed to send out all notifications`);
    logger.error(e);
  } finally {
    sendMailQueue.close();
  }
};

export default sendNotificationEmail;
