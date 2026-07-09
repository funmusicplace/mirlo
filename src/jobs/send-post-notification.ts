import prisma from "@mirlo/prisma";
import * as cheerio from "cheerio";
import { flatten, uniqBy } from "lodash";

import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { getClient } from "../utils/getClient";
import { getSafeErrorContext } from "../utils/logging";
import { serializePost } from "../utils/serialize/post";

import { parseOutIframes } from "./parse-out-iframes";

/**
 * Parses post HTML content for local artist mentions and returns their userIds.
 * Mentions are inserted as links with href pointing to /v1/artists/{urlSlug}.
 */
async function findMentionedLocalArtistUserIds(
  content: string
): Promise<number[]> {
  const $ = cheerio.load(content);
  const urlSlugs: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Mentions of local artists are inserted as links to /v1/artists/{urlSlug}
    const match = href.match(/\/v1\/artists\/([\w-]+)$/);
    if (match) {
      urlSlugs.push(match[1]);
    }
  });

  if (urlSlugs.length === 0) return [];

  const artists = await prisma.profile.findMany({
    where: { urlSlug: { in: urlSlugs }, deletedAt: null },
    select: { userId: true },
  });

  return artists.map((a) => a.userId);
}

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

    const hasContent = post.content && post.content.trim().length > 0;
    // Drafts and empty posts shouldn't appear anywhere — exit before claiming.
    // shouldSendEmail is checked later, so the post still gets in-app
    // notifications even when the author opted out of emails (#2071).
    if (post.isDraft || !hasContent) {
      logger.info(
        `sendPostNotification: skipping post ${postId} (draft=${post.isDraft}, hasContent=${hasContent})`
      );
      return;
    }

    // Atomically claim the post for sending. updateMany with the condition
    // acts as a mutex — only one job execution (across retries or concurrent
    // cron-queued duplicates) will get count=1 here. Any subsequent attempt
    // sees count=0 and exits early, preventing duplicate emails.
    const claim = await prisma.post.updateMany({
      where: { id: postId, hasAnnounceEmailBeenSent: false },
      data: { hasAnnounceEmailBeenSent: true },
    });

    if (claim.count === 0) {
      logger.info(
        `sendPostNotification: post ${postId} already claimed by another job, skipping`
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

    // Pick the deliveryMethod that reflects which deliveries we will actually
    // perform for this post. shouldSendEmail=false still creates an in-app
    // notification so subscribers see the post in their "Artists you follow"
    // feed, just without the email side-effect (#2071).
    const wantsEmail = post.shouldSendEmail;
    const wantsActivityPub = !!post.artist?.activityPub;
    const deliveryMethod = wantsEmail
      ? wantsActivityPub
        ? ("BOTH" as const)
        : ("EMAIL" as const)
      : wantsActivityPub
        ? ("ACTIVITYPUB" as const)
        : ("IN_APP" as const);

    // Create notifications in the DB
    const createdNotifications = await prisma.notification.createMany({
      data: uniqueSubscribers.map((subscriber) => ({
        postId,
        userId: subscriber.id,
        notificationType: "NEW_ARTIST_POST" as const,
        deliveryMethod,
      })),
      skipDuplicates: true,
    });

    logger.info(
      `sendPostNotification: created ${createdNotifications.count} new notifications for post ${postId} (deliveryMethod=${deliveryMethod})`
    );

    if (wantsEmail) {
      const notificationsToEmail = await prisma.notification.findMany({
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

      // Pass the post URL as a fallback so embedded tracks/trackGroups link
      // to the post when their parent album is unreachable (draft, private,
      // unreleased, deleted). Otherwise the email link 404s. See #1703.
      const { applicationUrl } = await getClient();
      const postUrl = `${applicationUrl}/${post.artist?.urlSlug ?? ""}/posts/${post.urlSlug ?? post.id}`;
      const htmlContent = await parseOutIframes(post.content || "", postUrl);

      for (const notification of notificationsToEmail) {
        if (!notification.user?.email) {
          logger.warn(
            `sendPostNotification: skipping notification ${notification.id} for post ${postId} because recipient email is missing`
          );
          continue;
        }

        const postForEmail = serializePost({
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
            jobId: `announce-post-published-${postId}-${notification.userId}`,
          }
        );
      }
    } else {
      logger.info(
        `sendPostNotification: shouldSendEmail=false for post ${postId}, skipping email queue`
      );
    }

    // Create in-app notifications for mentioned local artists
    const mentionedArtistUserIds = await findMentionedLocalArtistUserIds(
      post.content || ""
    );
    if (mentionedArtistUserIds.length > 0) {
      await prisma.notification.createMany({
        data: mentionedArtistUserIds.map((userId) => ({
          postId,
          userId,
          notificationType: "MENTION_IN_POST" as const,
          deliveryMethod: "IN_APP" as const,
        })),
        skipDuplicates: true,
      });
      logger.info(
        `sendPostNotification: created ${mentionedArtistUserIds.length} mention notification(s) for post ${postId}`
      );
    }

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
