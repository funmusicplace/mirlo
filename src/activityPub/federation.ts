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
import { buildFeedForProfile } from "../routers/v1/artists/{id}/feed";
import { findProfileIdForURLSlug } from "../utils/artist";
import { getClient } from "../utils/getClient";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
} from "../utils/minio";
import { isPost, isTrackGroup } from "../utils/typeguards";

async function ensureProfileHasApKeys(urlSlug: string) {
  const profile = await prisma.profile.findFirst({ where: { urlSlug } });
  if (!profile) throw new Error(`Artist not found: ${urlSlug}`);

  if (!profile.apPublicKey || !profile.apPrivateKey) {
    const { publicKey, privateKey } =
      await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
    const publicJwk = JSON.stringify(await exportJwk(publicKey));
    const privateJwk = JSON.stringify(await exportJwk(privateKey));

    await prisma.profile.update({
      where: { id: profile.id },
      data: { apPublicKey: publicJwk, apPrivateKey: privateJwk },
    });

    return { ...profile, apPublicKey: publicJwk, apPrivateKey: privateJwk };
  }
  return profile;
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
      const parsedId = await findProfileIdForURLSlug(identifier);
      if (!parsedId) return null;

      const profile = await prisma.profile.findFirst({
        where: { id: parsedId, enabled: true, activityPub: true },
        include: { avatar: true, background: true },
      });

      if (!profile) return null;

      const client = await getClient();
      const profileWithKeys = await ensureProfileHasApKeys(identifier);
      let publicKeyObj: CryptographicKey | undefined;
      if (profileWithKeys.apPublicKey) {
        const pubKey = await importJwk(
          JSON.parse(profileWithKeys.apPublicKey),
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
        name: profile.name,
        summary: profile.bio ?? undefined,
        discoverable: true,
        inbox: ctx.getInboxUri(identifier),
        outbox: ctx.getOutboxUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        url: new URL(`${client.applicationUrl}/${identifier}`),
        publicKey: publicKeyObj,
        icon: profile.avatar
          ? new Image({
              mediaType: "image/webp",
              url: new URL(
                generateFullStaticImageUrl(
                  profile.avatar.url[0],
                  finalArtistAvatarBucket
                )
              ),
            })
          : undefined,
        image: profile.background
          ? new Image({
              mediaType: "image/webp",
              url: new URL(
                generateFullStaticImageUrl(
                  profile.background.url[0],
                  finalArtistBackgroundBucket
                )
              ),
            })
          : undefined,
      });
    }
  )
  .setKeyPairsDispatcher(async (_ctx, identifier) => {
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return [];

    let profile;
    try {
      profile = await ensureProfileHasApKeys(identifier);
    } catch (e) {
      logger.warn(`ensureProfileHasApKeys failed for ${identifier}: ${e}`);
      return [];
    }

    if (!profile.apPublicKey || !profile.apPrivateKey) return [];

    const publicKey = await importJwk(JSON.parse(profile.apPublicKey), "public");
    const privateKey = await importJwk(
      JSON.parse(profile.apPrivateKey),
      "private"
    );

    return [{ publicKey, privateKey }];
  });

federation
  .setOutboxDispatcher(
    "/v1/ap/artists/{identifier}/outbox",
    async (ctx, identifier) => {
      const parsedId = await findProfileIdForURLSlug(identifier);
      if (!parsedId) return null;

      const profile = await prisma.profile.findFirst({
        where: { id: parsedId, activityPub: true },
        include: {
          subscriptionTiers: true,
        },
      });
      if (!profile) return null;
      const { results: zipped } = await buildFeedForProfile(undefined, profile);
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
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return 0n;
    const profile = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
      include: {
        subscriptionTiers: true,
      },
    });
    if (!profile) return 0n;
    const { total } = await buildFeedForProfile(undefined, profile);
    return BigInt(total);
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
      profile: {
        enabled: true,
        activityPub: true,
      },
    },
    include: {
      profile: true,
    },
  });
};

federation.setObjectDispatcher(
  Article,
  "/v1/ap/artists/{identifier}/posts/{postId}",
  async (ctx, { identifier, postId }) => {
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return null;

    const post = await findAPPostById(Number(postId));
    if (!post || post.profileId !== parsedId) return null;

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
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return null;

    const trackGroup = await findAPReleaseById(Number(releaseId));
    if (!trackGroup || trackGroup.profileId !== parsedId) return null;

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
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return null;

    const profile = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
    });
    if (!profile) return null;

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
      const parsedId = await findProfileIdForURLSlug(identifier);
      if (!parsedId) return null;

      const profile = await prisma.profile.findFirst({
        where: { id: parsedId, activityPub: true },
      });
      if (!profile) return null;

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
    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return 0n;
    const profile = await prisma.profile.findFirst({
      where: { id: parsedId, activityPub: true },
    });
    if (!profile) return 0n;
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

    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return;

    const profile = await prisma.profile.findFirst({ where: { id: parsedId } });
    if (!profile) return;

    const actorHref = follow.actorId.href;

    await prisma.activityPubProfileFollowers.upsert({
      where: { actor_profileId: { profileId: profile.id, actor: actorHref } },
      create: { profileId: profile.id, actor: actorHref, inboxUrl: null },
      update: {},
    });

    await prisma.notification.create({
      data: {
        notificationType: "AP_FOLLOW",
        userId: profile.userId,
        metadata: { ap: { actor: actorHref } },
      },
    });

    (async () => {
      try {
        const followerActor = await follow.getActor(ctx);
        if (!followerActor?.inboxId) return;

        await prisma.activityPubProfileFollowers.updateMany({
          where: { profileId: profile.id, actor: actorHref },
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

    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId || !undo.actorId) return;

    await prisma.activityPubProfileFollowers.deleteMany({
      where: { profileId: parsedId, actor: undo.actorId.href },
    });

    logger.info(`ActivityPub Follow removed for ${undo.actorId.href} via Undo`);
  })
  .on(Delete, async (ctx, del) => {
    const identifier = ctx.recipient;
    if (!identifier || !del.actorId) return;

    const parsedId = await findProfileIdForURLSlug(identifier);
    if (!parsedId) return;

    await prisma.activityPubProfileFollowers.deleteMany({
      where: { profileId: parsedId, actor: del.actorId.href },
    });

    logger.info(
      `ActivityPub Delete: removed ${del.actorId.href} from followers`
    );
  });
