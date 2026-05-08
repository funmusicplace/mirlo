import { Article, Create, PUBLIC_COLLECTION } from "@fedify/fedify/vocab";
import prisma from "@mirlo/prisma";

import { federation, getTemporal } from "../activityPub/federation";
import { getPostUrl, root } from "../activityPub/utils";
import logger from "../logger";
import { getClient } from "../utils/getClient";

interface ApMention {
  href: string;
  name: string;
}

export function parseMentionsFromContent(content: string): ApMention[] {
  const mentions: ApMention[] = [];
  const anchorPattern =
    /<a\s[^>]*data-mention-actor="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(content)) !== null) {
    const actorId = match[1];
    const name = match[2].replace(/<[^>]+>/g, "").trim();
    if (actorId && name) {
      mentions.push({ href: actorId, name });
    }
  }
  return mentions;
}

/** * Sends published posts to ActivityPub followers' inboxes
 * This job should run periodically to deliver new posts to federated servers
 */
const sendPostToActivityPubFollowers = async () => {
  const date = new Date();

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      isDraft: false,
      isPublic: true,
      publishedAt: { lte: date },
      hasActivityPubBeenSent: false,
      artist: { activityPub: true },
    },
    select: {
      id: true,
      title: true,
      content: true,
      urlSlug: true,
      publishedAt: true,
      artist: {
        select: {
          id: true,
          urlSlug: true,
          name: true,
          activityPub: true,
          activityPubArtistFollowers: { select: { actor: true } },
        },
      },
    },
  });

  logger.info(
    `sendPostToActivityPubFollowers: found ${posts.length} posts to process`
  );

  for (const post of posts) {
    if (!post.artist) {
      logger.warn(
        `sendPostToActivityPubFollowers: post ${post.id} has no artist, skipping`
      );
      await prisma.post.update({
        where: { id: post.id },
        data: { hasActivityPubBeenSent: true },
      });
      continue;
    }

    const mentions = parseMentionsFromContent(post.content ?? "");
    const hasFollowers = post.artist.activityPubArtistFollowers.length > 0;

    if (!hasFollowers && mentions.length === 0) {
      logger.info(
        `sendPostToActivityPubFollowers: artist ${post.artist.urlSlug} has no followers and no mentions, skipping`
      );
      await prisma.post.update({
        where: { id: post.id },
        data: { hasActivityPubBeenSent: true },
      });
      continue;
    }

    logger.info(
      `sendPostToActivityPubFollowers: processing post ${post.id} (${mentions.length} mention(s), hasFollowers=${hasFollowers})`
    );

    const identifier = post.artist.urlSlug;
    const actorUri = new URL(`https://${root}/v1/ap/artists/${identifier}`);

    const ctx = await federation.createContext(
      new Request(`https://${root}`),
      undefined
    );
    const client = await getClient();
    const followersUri = ctx.getFollowersUri(identifier);

    const articleId = ctx.getObjectUri(Article, {
      identifier,
      postId: String(post.id),
    });
    const createId = ctx.getObjectUri(Create, {
      identifier,
      activityId: `post-${post.id}`,
    });

    const createActivity = new Create({
      id: createId,
      actors: [actorUri],
      to: PUBLIC_COLLECTION,
      cc: followersUri,
      published: getTemporal(post.publishedAt) as any,
      object: new Article({
        id: articleId,
        attribution: actorUri,
        content: post.content ?? undefined,
        name: post.title,
        url: getPostUrl(client.applicationUrl, identifier, post),
        to: PUBLIC_COLLECTION,
        cc: followersUri,
        published: getTemporal(post.publishedAt) as any,
      }),
    });

    if (hasFollowers) {
      try {
        await ctx.sendActivity({ identifier }, "followers", createActivity, {
          immediate: true,
        });
        logger.info(
          `sendPostToActivityPubFollowers: sent post ${post.id} to followers of ${identifier}`
        );
      } catch (error) {
        logger.error(
          `sendPostToActivityPubFollowers: failed to send post ${post.id} to followers:`,
          error
        );
      }
    }

    // Deliver to mentioned actors not already covered by the followers fanout
    const followerActorIds = new Set(
      post.artist.activityPubArtistFollowers.map((f) => f.actor)
    );
    const mentionsToDeliver = mentions.filter(
      (m) => !followerActorIds.has(m.href)
    );

    if (mentionsToDeliver.length > 0) {
      logger.info(
        `sendPostToActivityPubFollowers: sending post ${post.id} to ${mentionsToDeliver.length} mentioned actor(s)`
      );

      for (const mention of mentionsToDeliver) {
        try {
          const actorRes = await fetch(mention.href, {
            headers: { Accept: "application/activity+json" },
          });
          if (!actorRes.ok) {
            throw new Error(
              `Failed to fetch mentioned actor ${mention.href}: ${actorRes.status}`
            );
          }
          const actorDoc: any = await actorRes.json();
          const inboxUrl: string | undefined = actorDoc.inbox;
          if (!inboxUrl) {
            throw new Error(
              `No inbox found for mentioned actor ${mention.href}`
            );
          }
          await ctx.sendActivity(
            { identifier },
            { id: new URL(mention.href), inboxId: new URL(inboxUrl) },
            createActivity,
            { immediate: true }
          );
          logger.info(
            `sendPostToActivityPubFollowers: sent mention of post ${post.id} to ${mention.href}`
          );
        } catch (error) {
          logger.error(
            `sendPostToActivityPubFollowers: failed to send mention of post ${post.id} to ${mention.href}:`,
            error
          );
        }
      }
    }

    // Mark post as sent and clean up any related subscriber notifications,
    // even if some deliveries failed.
    await prisma.$transaction([
      prisma.post.update({
        where: { id: post.id },
        data: { hasActivityPubBeenSent: true },
      }),
      prisma.notification.updateMany({
        where: {
          postId: post.id,
          notificationType: "NEW_ARTIST_POST",
          deliveryMethod: { in: ["ACTIVITYPUB", "BOTH"] },
        },
        data: { isRead: true },
      }),
    ]);
  }
};

export default sendPostToActivityPubFollowers;
