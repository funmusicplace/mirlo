import crypto from "crypto";

import {
  createFederation,
  InProcessMessageQueue,
  MemoryKvStore,
} from "@fedify/fedify";
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
  Person,
  PUBLIC_COLLECTION,
  Undo,
  Audio,
} from "@fedify/fedify/vocab";
import prisma from "@mirlo/prisma";

import {
  buildPostCreateActivity,
  getPostUrl,
  getTemporal,
  parseMentionsFromContent,
  root,
} from "../activityPub/utils";
import logger from "../logger";
import { buildFeedForArtist } from "../routers/v1/artists/{id}/feed";
import { findArtistIdForURLSlug } from "../utils/artist";
import { getClient } from "../utils/getClient";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
} from "../utils/minio";
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

export const federation = createFederation<void>({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
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
              url: new URL(
                generateFullStaticImageUrl(
                  artist.avatar.url[0],
                  finalArtistAvatarBucket
                )
              ),
            })
          : undefined,
        image: artist.background
          ? new Image({
              mediaType: "image/webp",
              url: new URL(
                generateFullStaticImageUrl(
                  artist.background.url[0],
                  finalArtistBackgroundBucket
                )
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

federation
  .setOutboxDispatcher(
    "/v1/ap/artists/{identifier}/outbox",
    async (ctx, identifier) => {
      const parsedId = await findArtistIdForURLSlug(identifier);
      if (!parsedId) return null;

      const artist = await prisma.profile.findFirst({
        where: { id: parsedId, activityPub: true },
        include: {
          subscriptionTiers: true,
        },
      });
      if (!artist) return null;
      const { results: zipped } = await buildFeedForArtist(undefined, artist);
      const client = await getClient();
      const followersUri = ctx.getFollowersUri(identifier);
      const creates = zipped.map((item) => {
        if (isPost(item)) {
          return buildPostCreateActivity(
            ctx,
            identifier,
            item,
            client.applicationUrl,
            parseMentionsFromContent(item.content ?? "")
          );
        } else if (isTrackGroup(item)) {
          return new Create({
            id: ctx.getObjectUri(Create, {
              identifier,
              activityId: `release-${item.id}`,
            }),
            actor: ctx.getActorUri(identifier),
            to: PUBLIC_COLLECTION,
            cc: followersUri,
            published: getTemporal(item.releaseDate),
            object: new Audio({
              id: ctx.getObjectUri(Audio, {
                identifier,
                releaseId: String(item.urlSlug ?? item.id),
              }),
              name: item.title ?? undefined,
              content: item.about ?? undefined,
              published: getTemporal(item.releaseDate),
              to: PUBLIC_COLLECTION,
              cc: followersUri,
            }),
          });
        } else {
          throw new Error(`Unknown item type in feed: ${item}`);
        }
      });
      return {
        items: creates,
      };
    }
  )
  .setCounter(async (_ctx, identifier) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return 0n;
    const artist = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
      include: {
        subscriptionTiers: true,
      },
    });
    if (!artist) return 0n;
    const { total } = await buildFeedForArtist(undefined, artist);
    return BigInt(total);
  });

const findAPReleaseById = async (id: number) => {
  return await prisma.trackGroup.findFirst({
    where: {
      id,
      deletedAt: null,
      isHiddenTrackGroupForSongDrafts: false,
      adminEnabled: true,
      artist: {
        enabled: true,
        activityPub: true,
      },
    },
    include: {
      artist: true,
    },
  });
};

const findAPPostById = async (id: number) => {
  return await prisma.post.findFirst({
    where: {
      id,
      deletedAt: null,
      isDraft: false,
      isPublic: true,
      artist: {
        enabled: true,
        activityPub: true,
      },
    },
    include: {
      artist: true,
    },
  });
};

federation.setObjectDispatcher(
  Article,
  "/v1/ap/artists/{identifier}/posts/{postId}",
  async (ctx, { identifier, postId }) => {
    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return null;

    const post = await findAPPostById(Number(postId));
    if (!post || post.artistId !== parsedId) return null;

    const client = await getClient();
    return new Article({
      id: ctx.getObjectUri(Article, { identifier, postId }),
      name: post.title,
      content: post.content ?? undefined,
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
    if (!trackGroup || trackGroup.artistId !== parsedId) return null;

    return new Audio({
      id: ctx.getObjectUri(Audio, { identifier, releaseId }),
      name: trackGroup.title ?? undefined,
      content: trackGroup.about ?? undefined,
      published: getTemporal(trackGroup.releaseDate),
    });
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
      if (!post || post.artistId !== parsedId) return null;

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
      if (!trackGroup || trackGroup.artistId !== parsedId) return null;

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
        where: { artistId: parsedId },
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
      where: { artistId: parsedId },
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
      where: { actor_artistId: { artistId: artist.id, actor: actorHref } },
      create: { artistId: artist.id, actor: actorHref, inboxUrl: null },
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
          where: { artistId: artist.id, actor: actorHref },
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
      where: { artistId: parsedId, actor: undo.actorId.href },
    });

    logger.info(`ActivityPub Follow removed for ${undo.actorId.href} via Undo`);
  })
  .on(Delete, async (ctx, del) => {
    const identifier = ctx.recipient;
    if (!identifier || !del.actorId) return;

    const parsedId = await findArtistIdForURLSlug(identifier);
    if (!parsedId) return;

    await prisma.activityPubProfileFollowers.deleteMany({
      where: { artistId: parsedId, actor: del.actorId.href },
    });

    logger.info(
      `ActivityPub Delete: removed ${del.actorId.href} from followers`
    );
  });
