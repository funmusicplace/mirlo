import prisma from "../../prisma/prisma";
import sendMail from "./send-mail";

import logger from "../logger";
import { flatten } from "lodash";
import { markdownAsHtml } from "../utils/post";

const announcePublishPost = async () => {
  const posts = await prisma.post.findMany({
    where: {
      hasAnnounceEmailBeenSent: false,
      publishedAt: {
        lte: new Date(),
      },
      deletedAt: null,
    },
    include: {
      artist: {
        include: {
          subscriptionTiers: {
            include: {
              userSubscriptions: {
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
      const postContent = markdownAsHtml(post.content);
      logger.info(
        `mailing post: ${post.title} to ${subscriptions.length} subscribers`
      );
      console.log("postContent", postContent);
      await Promise.all(
        subscriptions.map(async (subscription) => {
          return sendMail({
            data: {
              template: "announce-post-published",
              message: {
                to: subscription.user.email,
              },
              locals: {
                subscription: subscription,
                artist: post.artist,
                post: {
                  ...post,
                  htmlContent: postContent,
                },
                host: process.env.API_DOMAIN,
                client: process.env.REACT_APP_CLIENT_DOMAIN,
              },
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

export default announcePublishPost;
