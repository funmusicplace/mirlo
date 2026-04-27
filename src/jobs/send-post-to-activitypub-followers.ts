import crypto from "crypto";

import { Create, Note } from "@fedify/fedify/vocab";
import prisma from "@mirlo/prisma";

import { federation, getTemporal } from "../activityPub/federation";
import { root } from "../activityPub/utils";
import logger from "../logger";

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

    try {
      await ctx.sendActivity(
        { identifier },
        "followers",
        new Create({
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
        }),
        { immediate: true }
      );

      logger.info(
        `sendPostToActivityPubFollowers: sent post ${post.id} to followers of ${identifier}`
      );
    } catch (error) {
      logger.error(
        `sendPostToActivityPubFollowers: failed to send post ${post.id}:`,
        error
      );
    }

    await prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }
};

export default sendPostToActivityPubFollowers;
