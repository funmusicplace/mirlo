import prisma from "@mirlo/prisma";

import logger from "../logger";
import { sendPostNotificationQueue } from "../queues/send-post-notification-queue";

/**
 * Trigger function: Finds posts ready to process notifications for
 * Discovers both manually published and scheduled posts where:
 * - Post is published (isDraft = false)
 * - publishedAt <= now (either published or scheduled time has arrived)
 * - Notifications haven't been processed yet
 * - Post has content
 *
 * shouldSendEmail is intentionally NOT filtered here so in-app notifications
 * are created for every published post; the email delivery step downstream
 * decides whether to actually queue an email (#2071).
 *
 * This is the single source of truth for post notifications.
 * Unpublish logic still works to cancel pending jobs within the grace period.
 */
export async function triggerPostNotifications() {
  const now = new Date();

  const postsToNotify = await prisma.post.findMany({
    where: {
      isDraft: false,
      deletedAt: null,
      publishedAt: {
        lte: now,
      },
      hasAnnounceEmailBeenSent: false,
      content: { not: "" },
      profile: {
        enabled: true,
        deletedAt: null,
      },
    },
    select: {
      id: true,
    },
  });

  logger.info(
    `triggerPostNotifications: found ${postsToNotify.length} posts ready to notify`
  );

  for (const post of postsToNotify) {
    logger.info(
      `triggerPostNotifications: queueing notification for post ${post.id}`
    );

    await sendPostNotificationQueue.add(
      "send-post-notification",
      { postId: post.id },
      {
        jobId: `post-notification-${post.id}`,
        removeOnComplete: true,
      }
    );
  }
}
