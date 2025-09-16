import prisma from "@mirlo/prisma";

import logger from "../logger";
import { flatten, uniqBy } from "lodash";

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
      isDraft: false,
      artist: {
        id: {
          in: nonDeletedArtistsWithSubscriptions.map((a) => a.id),
        },
      },
    },
    select: {
      id: true,
      artistId: true,
      content: true,
      artist: {
        where: {
          deletedAt: null,
        },
        select: {
          subscriptionTiers: {
            where: {
              deletedAt: null,
            },
            select: {
              userSubscriptions: {
                where: {
                  deletedAt: null,
                },
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  logger.info(`addPostToNotifications: found ${posts.length} posts`);

  try {
    await Promise.all(
      posts.map(async (post) => {
        const flatSubscriptions = flatten(
          post.artist?.subscriptionTiers.map((st) => st.userSubscriptions)
        );
        const subscriptions = uniqBy(flatSubscriptions, "userId");

        logger.info(
          `addPostToNotifciations: creating notifications for ${post.id}, ${post.artistId}, to ${subscriptions.length} with content: ${post.content}`
        );

        await prisma.$transaction(async (tx) => {
          logger.info(
            `addPostToNotifications: attempting to create ${subscriptions.length} notifications`
          );

          await tx.notification.createMany({
            data: subscriptions.map((s) => ({
              postId: post.id,
              userId: s.userId,
              notificationType: "NEW_ARTIST_POST",
            })),
            skipDuplicates: true,
          });

          logger.info(
            `addPostToNotifications: created ${subscriptions.length} notifications`
          );

          await tx.post.update({
            where: {
              id: post.id,
            },
            data: {
              hasAnnounceEmailBeenSent: true,
            },
          });
        });
      })
    );
  } catch (e) {
    console.error(e);
    logger.error(`addPostToNotifications: Failed to create all notifications`);
    logger.error(e);
  }
};

export default addPostToNotifications;
