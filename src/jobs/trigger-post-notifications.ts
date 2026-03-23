import prisma from "@mirlo/prisma";
import logger from "../logger";
import { sendPostNotificationQueue } from "../queues/send-post-notification-queue";

/**
 * Trigger function: Finds posts ready to send notifications
 * Discovers both manually published and scheduled posts where:
 * - Post is published (isDraft = false)
 * - publishedAt <= now (either published or scheduled time has arrived)
 * - Email hasn't been sent yet
 * - Post has content and shouldSendEmail is true
 *
 * This is the single source of truth for post notifications.
 * Unpublish logic still works to cancel pending jobs within the grace period.
 */
export async function triggerPostNotifications() {
  const now = new Date();

  const postsToNotify = await prisma.post.findMany({
    where: {
      isDraft: false,
      publishedAt: {
        lte: now,
      },
      hasAnnounceEmailBeenSent: false,
      content: { not: "" },
      shouldSendEmail: true,
      artist: {
        enabled: true,
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
      { removeOnComplete: true }
    );
  }
}
