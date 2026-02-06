import prisma from "@mirlo/prisma";
import logger from "../logger";
import crypto from "crypto";
import {
  rootArtist,
  createPostActivity,
  signAndSendActivityPubMessage,
} from "../activityPub/utils";

/**
 * Sends published posts to ActivityPub followers' inboxes
 * This job should run periodically to deliver new posts to federated servers
 */
const sendPostToActivityPubFollowers = async () => {
  const date = new Date();

  // Find notifications for posts that need to be sent to ActivityPub
  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: {
        lte: date,
      },
      notificationType: "NEW_ARTIST_POST",
      deliveryMethod: {
        in: ["ACTIVITYPUB", "BOTH"],
      },
      post: {
        deletedAt: null,
        isDraft: false,
        isPublic: true,
        publishedAt: {
          lte: date,
        },
      },
    },
    select: {
      id: true,
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          urlSlug: true,
          publishedAt: true,
          artistId: true,
          artist: {
            select: {
              id: true,
              urlSlug: true,
              name: true,
              activityPub: true,
              activityPubArtistFollowers: {
                select: {
                  actor: true,
                },
              },
            },
          },
        },
      },
    },
  });

  logger.info(
    `sendPostToActivityPubFollowers: found ${notifications.length} notifications to process`
  );

  // Group notifications by post to avoid sending the same post multiple times
  const postMap = new Map<
    number,
    {
      post: (typeof notifications)[0]["post"];
      notificationIds: string[];
    }
  >();

  for (const notif of notifications) {
    if (!notif.post) continue;

    const postId = notif.post.id;
    if (!postMap.has(postId)) {
      postMap.set(postId, {
        post: notif.post,
        notificationIds: [notif.id],
      });
    } else {
      postMap.get(postId)!.notificationIds.push(notif.id);
    }
  }

  const postValues = Array.from(postMap.values());
  logger.info(
    `sendPostToActivityPubFollowers: grouped into ${postMap.size} unique posts`
  );

  for (const { post, notificationIds } of postValues) {
    if (!post || !post.artist) {
      logger.warn(
        `sendPostToActivityPubFollowers: post ${post?.id} has no artist`
      );
      // Mark notifications as read even if post has no artist
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      continue;
    }

    if (!post.artist.activityPub) {
      logger.info(
        `sendPostToActivityPubFollowers: artist ${post.artist.urlSlug} does not have ActivityPub enabled`
      );
      // Mark notifications as read since AP is not enabled
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      continue;
    }

    const followers = post.artist.activityPubArtistFollowers;
    if (followers.length === 0) {
      logger.info(
        `sendPostToActivityPubFollowers: artist ${post.artist.urlSlug} has no followers`
      );
      // Mark notifications as read even if no followers
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      continue;
    }

    logger.info(
      `sendPostToActivityPubFollowers: sending post ${post.id} to ${followers.length} followers`
    );

    // Create the Create activity that wraps the Note
    const guid = crypto.randomBytes(16).toString("hex");
    const createActivity = await createPostActivity(post, post.artist, guid);

    // Send to each follower's inbox
    let successCount = 0;
    let errorCount = 0;

    for (const follower of followers) {
      try {
        const actorUrl = new URL(follower.actor);
        const domain = actorUrl.hostname;

        // Fetch the follower's actor document to get their inbox
        const actorResponse = await fetch(follower.actor, {
          headers: {
            Accept: "application/activity+json",
          },
        });

        if (!actorResponse.ok) {
          throw new Error(
            `Failed to fetch actor ${follower.actor}: ${actorResponse.status}`
          );
        }

        const actorDoc: any = await actorResponse.json();
        const inboxUrl = actorDoc.inbox;

        if (!inboxUrl) {
          throw new Error(`No inbox found for actor ${follower.actor}`);
        }

        // Sign and send the Create activity to the follower's inbox
        await signAndSendActivityPubMessage(
          createActivity,
          post.artist.urlSlug,
          inboxUrl,
          domain
        );

        successCount++;
        logger.info(
          `sendPostToActivityPubFollowers: sent post ${post.id} to ${follower.actor}`
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `sendPostToActivityPubFollowers: failed to send post ${post.id} to ${follower.actor}:`,
          error
        );
      }
    }

    logger.info(
      `sendPostToActivityPubFollowers: post ${post.id} - ${successCount} successful, ${errorCount} failed`
    );

    // Mark all notifications for this post as read even if some deliveries failed
    // (we don't want to retry forever)
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }
};

export default sendPostToActivityPubFollowers;
