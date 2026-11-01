import crypto from "crypto";

import { createFederation } from "@fedify/fedify";
import {
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
} from "@fedify/fedify/sig";
import {
  Accept,
  Article,
  CryptographicKey,
  Create,
  Delete,
  Follow,
  Image,
  isActor,
  Person,
  PUBLIC_COLLECTION,
  Undo,
  Audio,
} from "@fedify/fedify/vocab";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import prisma from "@mirlo/prisma";

import {
  buildPostCreateActivity,
  buildReleaseAudio,
  buildReleaseCreateActivity,
  getPostUrl,
  getTemporal,
  NODEINFO_PATH,
  parseMentionsFromContent,
  root,
} from "../activityPub/utils";
import { redisClient } from "../config/redis";
import logger from "../logger";
import {
  getFeedCountForProfile,
  getFeedPageForProfile,
} from "../routers/v1/artists/{id}/feed";
import {
  findArtistIdForURLSlug,
  whereForVisibleProfile,
} from "../utils/artist";
import { getClient } from "../utils/getClient";
import { storedImageUrl } from "../utils/images";
import { postImagesForContent, resolvePostContent } from "../utils/postContent";
import { getSiteSettings } from "../utils/settings";
import { whereForVisibleTrackGroup } from "../utils/trackGroup";
import { isPost, isTrackGroup } from "../utils/typeguards";

export async function ensureArtistHasApKeys(urlSlug: string) {
  const artist = await prisma.profile.findFirst({ where: { urlSlug } });
  if (!artist) throw new Error(`Artist not found: ${urlSlug}`);

  if (!artist.apPublicKey || !artist.apPrivateKey) {
    const { publicKey, privateKey } =
      await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
    const publicJwk = JSON.stringify(await exportJwk(publicKey));
    const privateJwk = JSON.stringify(await exportJwk(privateKey));

    await prisma.profile.update({
      where: { id: artist.id },
      data: { apPublicKey: publicJwk, apPrivateKey: privateJwk },
    });

    return { ...artist, apPublicKey: publicJwk, apPrivateKey: privateJwk };
  }

  return artist;
}

export const kvStore = new RedisKvStore(redisClient);
export const messageQueue = new RedisMessageQueue(() =>
  redisClient.duplicate()
);

export const federation = createFederation<void>({
  kv: kvStore,
  queue: messageQueue,
  skipSignatureVerification: process.env.NODE_ENV === "test",
});

federation
  .setActorDispatcher(
    "/v1/ap/artists/{identifier}",
    async (ctx, identifier) => {
      const parsedId = await findArtistIdForURLSlug(identifier);
      if (!parsedId) return null;

      const artist = await prisma.profile.findFirst({
        where: { id: parsedId, enabled: true, activityPub: true },
        include: { avatar: true, background: true },
      });

      if (!artist) return null;

      const client = await getClient();
      const artistWithKeys = await ensureArtistHasApKeys(identifier);
      let publicKeyObj: CryptographicKey | undefined;
      if (artistWithKeys.apPublicKey) {
        const pubKey = await importJwk(
          JSON.parse(artistWithKeys.apPublicKey),
          "public"
        );
        const actorUri = ctx.getActorUri(identifier);
        publicKeyObj = new CryptographicKey({
          id: new URL(`${actorUri.href}#main-key`),
          owner: actorUri,
          publicKey: pubKey,
        });
      }

      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: artist.name,
        summary: artist.bio ?? undefined,
        discoverable: true,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        url: new URL(`${client.applicationUrl}/${identifier}`),
        publicKey: publicKeyObj,
        icon: artist.avatar
          ? new Image({
              mediaType: "image/webp",
              url: new URL(storedImageUrl(artist.avatar, artist.avatar.url[0])),
            })
          : undefined,
        image: artist.background
          ? new Image({
              mediaType: "image/webp",
              url: new URL(
                storedImageUrl(artist.background, artist.background.url[0])
              ),
            })
          : undefined,
      });
    }
  )
  .setKeyPairsDispatcher(async (_ctx, identifier) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return [];

    let artist;
    try {
      artist = await ensureArtistHasApKeys(identifier);
    } catch (e) {
      logger.warn(`ensureArtistHasApKeys failed for ${identifier}: ${e}`);
      return [];
    }

    if (!artist.apPublicKey || !artist.apPrivateKey) return [];

    const publicKey = await importJwk(JSON.parse(artist.apPublicKey), "public");
    const privateKey = await importJwk(
      JSON.parse(artist.apPrivateKey),
      "private"
    );

    return [{ publicKey, privateKey }];
  });

const OUTBOX_PAGE_SIZE = 20;

federation
  .setOutboxDispatcher(
    "/v1/ap/artists/{identifier}/outbox",
    async (ctx, identifier, cursor) => {
      const parsedId = await findArtistIdForURLSlug(identifier);
      if (!parsedId) return null;

      const artist = await prisma.profile.findFirst({
        where: { id: parsedId, activityPub: true },
        include: {
          subscriptionTiers: true,
        },
      });
      if (!artist) return null;
      const skip = Math.max(parseInt(cursor ?? "", 10) || 0, 0);
      const { results: page, hasMore } = await getFeedPageForProfile(
        undefined,
        artist,
        OUTBOX_PAGE_SIZE,
        skip
      );
      const nextCursor = hasMore ? String(skip + OUTBOX_PAGE_SIZE) : null;
      const prevCursor =
        skip > 0 ? String(Math.max(0, skip - OUTBOX_PAGE_SIZE)) : null;

      const client = await getClient();
      const creates = page.map((item) => {
        if (isPost(item)) {
          return buildPostCreateActivity(
            ctx,
            identifier,
            { ...item, images: [] },
            client.applicationUrl,
            parseMentionsFromContent(item.content ?? "")
          );
        } else if (isTrackGroup(item)) {
          return buildReleaseCreateActivity(
            ctx,
            identifier,
            { ...item, tags: (item as { tags?: string[] }).tags ?? [] },
            client.applicationUrl
          );
        } else {
          throw new Error(`Unknown item type in feed: ${item}`);
        }
      });
      return {
        items: creates,
        nextCursor,
        prevCursor,
      };
    }
  )
  .setFirstCursor(async () => "0")
  .setCounter(async (_ctx, identifier) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return 0n;
    const artist = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
    });
    if (!artist) return 0n;
    return BigInt(await getFeedCountForProfile(artist));
  });

const findAPReleaseById = async (id: number) => {
  return await prisma.trackGroup.findFirst({
    where: {
      id,
      deletedAt: null,
      isHiddenTrackGroupForSongDrafts: false,
      adminEnabled: true,
      profile: {
        enabled: true,
        activityPub: true,
      },
    },
    include: {
      profile: true,
      cover: true,
      tags: { include: { tag: true } },
    },
  });
};

export const sendReleaseToActivityPubFollowers = async (
  trackGroupId: number
) => {
  const trackGroup = await findAPReleaseById(trackGroupId);
  if (!trackGroup) return;

  const identifier = trackGroup.profile.urlSlug;
  const ctx = federation.createContext(
    new Request(`https://${root}`),
    undefined
  );
  const client = await getClient();
  await ctx.sendActivity(
    { identifier },
    "followers",
    buildReleaseCreateActivity(
      ctx,
      identifier,
      { ...trackGroup, tags: trackGroup.tags.map((t) => t.tag.tag) },
      client.applicationUrl
    )
  );
};

const findAPPostById = async (id: number) => {
  return await prisma.post.findFirst({
    where: {
      id,
      deletedAt: null,
      isDraft: false,
      isPublic: true,
      profile: {
        enabled: true,
        activityPub: true,
      },
    },
    include: {
      profile: true,
      images: postImagesForContent,
    },
  });
};

const MENTION_LOOKUP_TIMEOUT_MS = 5000;

export const sendPostToActivityPubFollowers = async (postId: number) => {
  const post = await findAPPostById(postId);
  if (!post?.profile) return false;

  const identifier = post.profile.urlSlug;
  const ctx = federation.createContext(
    new Request(`https://${root}`),
    undefined
  );
  const client = await getClient();
  const mentions = parseMentionsFromContent(post.content ?? "");
  const activity = buildPostCreateActivity(
    ctx,
    identifier,
    post,
    client.applicationUrl,
    mentions
  );

  await ctx.sendActivity({ identifier }, "followers", activity);

  // The followers fanout skips followers without a known inbox.
  const followersWithInbox = await prisma.activityPubProfileFollowers.findMany({
    where: { profileId: post.profile.id, inboxUrl: { not: null } },
    select: { actor: true },
  });
  const coveredActors = followersWithInbox.map((f) => f.actor);
  const mentionsToDeliver = mentions.filter(
    (m) =>
      !m.href.startsWith(`https://${root}/`) && !coveredActors.includes(m.href)
  );

  for (const mention of mentionsToDeliver) {
    try {
      const actor = await ctx.lookupObject(mention.href, {
        signal: AbortSignal.timeout(MENTION_LOOKUP_TIMEOUT_MS),
      });
      if (!isActor(actor) || !actor.inboxId) {
        throw new Error(`No inbox found for mentioned actor ${mention.href}`);
      }
      await ctx.sendActivity({ identifier }, actor, activity);
    } catch (error) {
      logger.error(
        `sendPostToActivityPubFollowers: failed to send mention of post ${post.id} to ${mention.href}:`,
        error
      );
    }
  }

  return true;
};

federation.setObjectDispatcher(
  Article,
  "/v1/ap/artists/{identifier}/posts/{postId}",
  async (ctx, { identifier, postId }) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return null;

    const post = await findAPPostById(Number(postId));
    if (!post || post.profileId !== parsedId) return null;

    const client = await getClient();
    return new Article({
      id: ctx.getObjectUri(Article, { identifier, postId }),
      attribution: ctx.getActorUri(identifier),
      to: PUBLIC_COLLECTION,
      name: post.title,
      content: resolvePostContent(post) ?? undefined,
      published: getTemporal(post.publishedAt),
      url: getPostUrl(client.applicationUrl, identifier, post),
    });
  }
);

federation.setObjectDispatcher(
  Audio,
  "/v1/ap/artists/{identifier}/releases/{releaseId}",
  async (ctx, { identifier, releaseId }) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return null;

    const trackGroup = await findAPReleaseById(Number(releaseId));
    if (!trackGroup || trackGroup.profileId !== parsedId) return null;

    const client = await getClient();

    return buildReleaseAudio(
      ctx,
      identifier,
      { ...trackGroup, tags: trackGroup.tags.map((t) => t.tag.tag) },
      client.applicationUrl
    );
  }
);

federation.setObjectDispatcher(
  Create,
  "/v1/ap/artists/{identifier}/activities/{activityId}",
  async (ctx, { identifier, activityId }) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return null;

    const artist = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
    });
    if (!artist) return null;

    const dashIndex = activityId.indexOf("-");
    if (dashIndex === -1) return null;
    const type = activityId.slice(0, dashIndex);
    const rawId = Number(activityId.slice(dashIndex + 1));
    if (isNaN(rawId)) return null;

    if (type === "post") {
      const post = await findAPPostById(Number(rawId));
      if (!post || post.profileId !== parsedId) return null;

      return new Create({
        id: ctx.getObjectUri(Create, { identifier, activityId }),
        actor: ctx.getActorUri(identifier),
        object: ctx.getObjectUri(Article, {
          identifier,
          postId: String(rawId),
        }),
        published: getTemporal(post.publishedAt),
      });
    } else if (type === "release") {
      const trackGroup = await findAPReleaseById(Number(rawId));
      if (!trackGroup || trackGroup.profileId !== parsedId) return null;

      return new Create({
        id: ctx.getObjectUri(Create, { identifier, activityId }),
        actor: ctx.getActorUri(identifier),
        object: ctx.getObjectUri(Audio, {
          identifier,
          releaseId: String(rawId),
        }),
        published: getTemporal(trackGroup.releaseDate),
      });
    }

    return null;
  }
);

federation
  .setFollowersDispatcher(
    "/v1/ap/artists/{identifier}/followers",
    async (_ctx, identifier) => {
      const parsedId = await findArtistIdForURLSlug(identifier);
      if (!parsedId) return null;

      const artist = await prisma.profile.findFirst({
        where: { id: parsedId, activityPub: true },
      });
      if (!artist) return null;

      const followers = await prisma.activityPubProfileFollowers.findMany({
        where: { profileId: parsedId },
      });

      return {
        items: followers
          .filter((f) => f.inboxUrl !== null)
          .map((f) => ({
            id: new URL(f.actor),
            inboxId: new URL(f.inboxUrl!),
          })),
      };
    }
  )
  .setCounter(async (_ctx, identifier) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return 0n;
    const artist = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
    });
    if (!artist) return 0n;
    const count = await prisma.activityPubProfileFollowers.count({
      where: { profileId: parsedId },
    });
    return BigInt(count);
  });

federation
  .setInboxListeners("/v1/ap/artists/{identifier}/inbox")
  .on(Follow, async (ctx, follow) => {
    const identifier = ctx.recipient;
    if (!identifier || !follow.actorId) return;

    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return;

    const artist = await prisma.profile.findFirst({ where: { id: parsedId } });
    if (!artist) return;

    const actorHref = follow.actorId.href;

    await prisma.activityPubProfileFollowers.upsert({
      where: { actor_profileId: { profileId: artist.id, actor: actorHref } },
      create: { profileId: artist.id, actor: actorHref, inboxUrl: null },
      update: {},
    });

    await prisma.notification.create({
      data: {
        notificationType: "AP_FOLLOW",
        userId: artist.userId,
        metadata: { ap: { actor: actorHref } },
      },
    });

    (async () => {
      try {
        const followerActor = await follow.getActor(ctx);
        if (!followerActor?.inboxId) return;

        await prisma.activityPubProfileFollowers.updateMany({
          where: { profileId: artist.id, actor: actorHref },
          data: { inboxUrl: followerActor.inboxId.href },
        });

        const guid = crypto.randomBytes(16).toString("hex");
        await ctx.sendActivity(
          { identifier },
          followerActor,
          new Accept({
            id: new URL(
              `https://${root}/v1/artists/${identifier}#accept-${guid}`
            ),
            actor: ctx.getActorUri(identifier),
            object: follow,
          }),
          { immediate: true }
        );

        logger.info(`ActivityPub Accept sent for ${actorHref} → ${identifier}`);
      } catch (e) {
        logger.warn(`ActivityPub Accept failed for ${actorHref}: ${e}`);
      }
    })();

    logger.info(`ActivityPub Follow stored for ${actorHref} → ${identifier}`);
  })
  .on(Undo, async (ctx, undo) => {
    const identifier = ctx.recipient;
    if (!identifier) return;

    const object = await undo.getObject(ctx);
    if (!(object instanceof Follow)) return;

    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId || !undo.actorId) return;

    await prisma.activityPubProfileFollowers.deleteMany({
      where: { profileId: parsedId, actor: undo.actorId.href },
    });

    logger.info(`ActivityPub Follow removed for ${undo.actorId.href} via Undo`);
  })
  .on(Delete, async (ctx, del) => {
    const identifier = ctx.recipient;
    if (!identifier || !del.actorId) return;

    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return;

    await prisma.activityPubProfileFollowers.deleteMany({
      where: { profileId: parsedId, actor: del.actorId.href },
    });

    logger.info(
      `ActivityPub Delete: removed ${del.actorId.href} from followers`
    );
  });

federation.setNodeInfoDispatcher(NODEINFO_PATH, async () => {
  const apProfile = { ...whereForVisibleProfile(), activityPub: true };
  const [settings, users, localPosts, releases] = await Promise.all([
    getSiteSettings(),
    prisma.profile.count({ where: apProfile }),
    prisma.post.count({
      where: {
        isDraft: false,
        isPublic: true,
        publishedAt: { lte: new Date() },
        profile: apProfile,
      },
    }),
    prisma.trackGroup.count({
      where: {
        ...whereForVisibleTrackGroup(),
        isPublic: true,
        isHiddenTrackGroupForSongDrafts: false,
        publishedAt: { lte: new Date() },
        profile: apProfile,
      },
    }),
  ]);

  return {
    software: {
      name: "mirlo",
      version: "1.0.0",
      repository: new URL("https://github.com/funmusicplace/mirlo"),
    },
    protocols: ["activitypub"],
    openRegistrations: !settings.isClosedToPublicArtistSignup,
    usage: {
      users: { total: users },
      localPosts: localPosts + releases,
      localComments: 0,
    },
  };
});
