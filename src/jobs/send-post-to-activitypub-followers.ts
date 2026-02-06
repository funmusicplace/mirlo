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

  // Find posts that haven't been sent to ActivityPub yet
  const posts = await prisma.post.findMany({
    where: {
      publishedAt: {
        lte: date,
      },
      hasBeenSentToActivityPub: false,
      deletedAt: null,
      isDraft: false,
      isPublic: true,
    },
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
          activityPubArtistFollowers: {
            select: {
              actor: true,
            },
          },
        },
      },
    },
  });

  logger.info(
    `sendPostToActivityPubFollowers: found ${posts.length} posts to send`
  );

  for (const post of posts) {
    if (!post.artist) {
      logger.warn(
        `sendPostToActivityPubFollowers: post ${post.id} has no artist`
      );
      continue;
    }

    const followers = post.artist.activityPubArtistFollowers;
    if (followers.length === 0) {
      logger.info(
        `sendPostToActivityPubFollowers: artist ${post.artist.urlSlug} has no followers, marking as sent`
      );
      await prisma.post.update({
        where: { id: post.id },
        data: { hasBeenSentToActivityPub: true },
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

    // Mark the post as sent even if some deliveries failed
    // (we don't want to retry forever)
    await prisma.post.update({
      where: { id: post.id },
      data: { hasBeenSentToActivityPub: true },
    });
  }
};

export default sendPostToActivityPubFollowers;
