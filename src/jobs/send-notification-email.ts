import prisma from "../../prisma/prisma";
import logger from "../logger";
import sendMail from "./send-mail";

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

  await Promise.all(
    notifications.map(async (notification) => {
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
          await sendMail({
            data: {
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
            },
          });
        }
        await prisma.notification.update({
          where: {
            id: notification.id,
          },
          data: {
            isRead: true,
          },
        });
      }
    })
  );
};

export default sendNotificationEmail;
