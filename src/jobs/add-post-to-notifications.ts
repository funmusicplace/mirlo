import prisma from "../../prisma/prisma";

import logger from "../logger";
import { flatten } from "lodash";

const addPostToNotifications = async () => {
  const date = new Date();

  const nonDeletedArtistsWithSubscriptions = await prisma.artist.findMany({
    where: {
      deletedAt: null,
      subscriptionTiers: {
        some: {
          deletedAt: null,
          userSubscriptions: {
            some: {
              deletedAt: null,
              user: {
                deletedAt: null,
                emailConfirmationToken: null,
              },
            },
          },
        },
      },
    },
  });

  const posts = await prisma.post.findMany({
    where: {
      publishedAt: {
        lte: date,
      },
      hasAnnounceEmailBeenSent: false,
      deletedAt: null,
      artist: {
        id: {
          in: nonDeletedArtistsWithSubscriptions.map((a) => a.id),
        },
      },
    },
    include: {
      artist: {
        where: {
          deletedAt: null,
        },
        include: {
          subscriptionTiers: {
            where: {
              deletedAt: null,
            },
            include: {
              userSubscriptions: {
                where: {
                  deletedAt: null,
                },
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
  });

  logger.info(`found #${posts.length} posts`);

  await Promise.all(
    posts.map(async (post) => {
      const subscriptions = flatten(
        post.artist?.subscriptionTiers.map((st) => st.userSubscriptions)
      );
      const postContent = post.content;

      await Promise.all(
        subscriptions.map(async (subscription) => {
          await prisma.notification.create({
            data: {
              postId: post.id,
              content: postContent,
              userId: subscription.userId,
              notificationType: "NEW_ARTIST_POST",
            },
          });
        }) ?? []
      );

      await prisma.post.update({
        where: {
          id: post.id,
        },
        data: {
          hasAnnounceEmailBeenSent: true,
        },
      });
    })
  );
};

export default addPostToNotifications;
