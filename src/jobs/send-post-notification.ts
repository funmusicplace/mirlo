import prisma from "@mirlo/prisma";
import { flatten, uniqBy } from "lodash";

import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { getClient } from "../utils/getClient";
import { getSafeErrorContext } from "../utils/logging";
import { processSinglePost } from "../utils/post";

import { parseOutIframes } from "./parse-out-iframes";

/**
 * Job processor: Sends notification emails when a post is published
 * Handles the complete flow: creates notifications + queues emails
 * Idempotent: safe to retry on failure without creating duplicates
 */
export default async function sendPostNotification(job: {
  data: { postId: number };
}) {
  const { postId } = job.data;
  logger.info(`sendPostNotification: processing post ${postId}`);

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        featuredImage: {
          select: {
            id: true,
            extension: true,
          },
        },
        artist: {
          include: {
            subscriptionTiers: {
              where: { deletedAt: null },
              include: {
                userSubscriptions: {
                  where: { deletedAt: null },
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        deletedAt: true,
                        emailConfirmationToken: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      logger.warn(`sendPostNotification: post ${postId} not found`);
      return;
    }

    // Only process published, non-draft posts that should send email
    const hasContent = post.content && post.content.trim().length > 0;
    if (
      post.isDraft ||
      !post.shouldSendEmail ||
      !hasContent ||
      post.hasAnnounceEmailBeenSent
    ) {
      logger.info(
        `sendPostNotification: skipping post ${postId} (draft=${post.isDraft}, shouldSendEmail=${post.shouldSendEmail}, hasContent=${hasContent}, alreadySent=${post.hasAnnounceEmailBeenSent})`
      );
      return;
    }

    // Collect all unique subscribers (filtering out deleted/unconfirmed users)
    const flatSubscriptions = flatten(
      (post.artist?.subscriptionTiers ?? []).map((st) =>
        st.userSubscriptions
          .map((us) => us.user)
          .filter(
            (u) => u.deletedAt === null && u.emailConfirmationToken === null
          )
      )
    );
    const uniqueSubscribers = uniqBy(flatSubscriptions, "id");

    logger.info(
      `sendPostNotification: found ${uniqueSubscribers.length} subscribers for post ${postId}`
    );

    // Create notifications and queue emails in a transaction
    // This ensures atomicity - if it fails halfway, the transaction rolls back
    await prisma.$transaction(async (tx) => {
      // Create notifications (skipDuplicates prevents duplicate emails)
      const createdNotifications = await tx.notification.createMany({
        data: uniqueSubscribers.map((subscriber) => ({
          postId,
          userId: subscriber.id,
          notificationType: "NEW_ARTIST_POST" as const,
          deliveryMethod: post.artist?.activityPub
            ? ("BOTH" as const)
            : ("EMAIL" as const),
        })),
        skipDuplicates: true,
      });

      logger.info(
        `sendPostNotification: created ${createdNotifications.count} new notifications for post ${postId}`
      );

      // Find ALL notifications for this post (both newly created and existing)
      // to queue emails for them
      const notificationsToEmail = await tx.notification.findMany({
        where: {
          postId,
          deliveryMethod: { in: ["EMAIL", "BOTH"] },
        },
        include: {
          user: { select: { email: true } },
        },
      });

      logger.info(
        `sendPostNotification: queueing ${notificationsToEmail.length} email(s) for post ${postId}`
      );

      const htmlContent = await parseOutIframes(post.content || "");

      // Queue emails for all notifications
      for (const notification of notificationsToEmail) {
        if (!notification.user?.email) {
          logger.warn(
            `sendPostNotification: skipping notification ${notification.id} for post ${postId} because recipient email is missing`
          );
          continue;
        }

        const postForEmail = processSinglePost({
          id: post.id,
          title: post.title,
          urlSlug: post.urlSlug,
          featuredImage: post.featuredImage,
          content: post.content,
          isPublic: post.isPublic,
        });

        await sendMailQueue.add(
          "send-mail",
          {
            template: "announce-post-published",
            message: {
              to: notification.user.email,
            },
            locals: {
              artist: {
                id: post.artist?.id,
                name: post.artist?.name,
                urlSlug: post.artist?.urlSlug,
              },
              post: {
                ...postForEmail,
                htmlContent,
              },
              email: encodeURIComponent(notification.user.email),
              host: process.env.API_DOMAIN,
              client: (await getClient()).applicationUrl,
            },
          },
          {
            // Stable job IDs make email enqueue idempotent across retries.
            jobId: `announce-post-published:${postId}:${notification.id}`,
          }
        );
      }

      // Mark post as having email announcement sent
      // This prevents re-processing on job retry
      await tx.post.update({
        where: { id: postId },
        data: { hasAnnounceEmailBeenSent: true },
      });
    });

    logger.info(`sendPostNotification: completed for post ${postId}`);
  } catch (error) {
    logger.error(`sendPostNotification: error processing post ${postId}`, {
      postId,
      ...getSafeErrorContext(error),
    });
    // Re-throw to let BullMQ handle retry logic
    throw error;
  }
}
