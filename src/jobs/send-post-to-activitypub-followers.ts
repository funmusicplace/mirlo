import crypto from "crypto";

import { Create, Note } from "@fedify/fedify/vocab";
import prisma from "@mirlo/prisma";

import { federation, getTemporal } from "../activityPub/federation";
import { root } from "../activityPub/utils";
import logger from "../logger";

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

/**
 * Sends published posts to ActivityPub followers' inboxes
 * This job should run periodically to deliver new posts to federated servers
 */
const sendPostToActivityPubFollowers = async () => {
  const date = new Date();

  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: { lte: date },
      notificationType: "NEW_ARTIST_POST",
      deliveryMethod: { in: ["ACTIVITYPUB", "BOTH"] },
      post: {
        deletedAt: null,
        isDraft: false,
        isPublic: true,
        publishedAt: { lte: date },
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
              activityPubArtistFollowers: { select: { actor: true } },
            },
          },
        },
      },
    },
  });

  logger.info(
    `sendPostToActivityPubFollowers: found ${notifications.length} notifications to process`
  );

  const postMap = new Map<
    number,
    { post: (typeof notifications)[0]["post"]; notificationIds: string[] }
  >();

  for (const notif of notifications) {
    if (!notif.post) continue;
    const postId = notif.post.id;
    if (!postMap.has(postId)) {
      postMap.set(postId, { post: notif.post, notificationIds: [notif.id] });
    } else {
      postMap.get(postId)!.notificationIds.push(notif.id);
    }
  }

  logger.info(
    `sendPostToActivityPubFollowers: grouped into ${postMap.size} unique posts`
  );

  for (const { post, notificationIds } of postMap.values()) {
    if (!post?.artist) {
      logger.warn(
        `sendPostToActivityPubFollowers: post ${post?.id} has no artist`
      );
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
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      continue;
    }

    if (post.artist.activityPubArtistFollowers.length === 0) {
      logger.info(
        `sendPostToActivityPubFollowers: artist ${post.artist.urlSlug} has no followers`
      );
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      continue;
    }

    const identifier = post.artist.urlSlug;
    const actorUri = new URL(`https://${root}/v1/ap/artists/${identifier}`);
    const noteId = new URL(
      `https://${root}/v1/ap/artists/${identifier}/posts/${post.urlSlug || post.id}`
    );
    const guid = crypto.randomBytes(16).toString("hex");

    const ctx = await federation.createContext(
      new Request(`https://${root}`),
      undefined
    );

    const mentions = parseMentionsFromContent(post.content ?? "");

    const createActivity = new Create({
      id: new URL(`${noteId.href}#activity-${guid}`),
      actors: [actorUri],
      to: new URL("https://www.w3.org/ns/activitystreams#Public"),
      cc: new URL(`${actorUri.href}/followers`),
      published: getTemporal(post.publishedAt) as any,
      object: new Note({
        id: noteId,
        attribution: actorUri,
        content: post.content ?? undefined,
        name: post.title,
        url: new URL(
          `${ctx.origin}/${identifier}/posts/${post.urlSlug || post.id}`
        ),
        to: new URL("https://www.w3.org/ns/activitystreams#Public"),
        cc: new URL(`${actorUri.href}/followers`),
        published: getTemporal(post.publishedAt) as any,
      }),
    });

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

    // Mark all notifications for this post as read even if some deliveries failed
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }
};

export default sendPostToActivityPubFollowers;
