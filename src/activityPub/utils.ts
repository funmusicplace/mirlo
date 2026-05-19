import { IncomingHttpHeaders } from "http";

import type { Context } from "@fedify/fedify";
import {
  Article,
  Create,
  Mention,
  PUBLIC_COLLECTION,
} from "@fedify/fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";

const { API_DOMAIN } = process.env;

export const root = new URL(API_DOMAIN || "http://localhost:3000").hostname;

export const rootArtist = `https://${root}/v1/artists/`;

export const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getTemporal = (date?: Date | null) => {
  if (!date) return undefined;
  return Temporal.Instant.fromEpochMilliseconds(date.getTime()) as any;
};

export interface ApMention {
  href: string;
  name: string;
}

export function parseMentionsFromContent(content: string): ApMention[] {
  const mentions: ApMention[] = [];
  const anchorPattern = /<a\s([^>]*)>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(content)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const actorMatch = /data-mention-actor="([^"]+)"/.exec(attrs);
    if (!actorMatch) continue;
    const actorId = actorMatch[1];
    const handleMatch = /data-mention-handle="([^"]+)"/.exec(attrs);
    const displayName = inner.replace(/<[^>]+>/g, "").trim();
    mentions.push({
      href: actorId,
      name: handleMatch ? handleMatch[1] : displayName,
    });
  }
  return mentions;
}

export function buildPostCreateActivity(
  ctx: Context<void>,
  identifier: string,
  post: {
    id: number;
    title: string | null;
    content?: string | null;
    urlSlug?: string | null;
    publishedAt?: Date | null;
  },
  applicationUrl: string,
  mentions: ApMention[] = []
): Create {
  const actorUri = ctx.getActorUri(identifier);
  const followersUri = ctx.getFollowersUri(identifier);
  const mentionUris = mentions.map((m) => new URL(m.href));
  const ccList = [followersUri, ...mentionUris];
  return new Create({
    id: ctx.getObjectUri(Create, { identifier, activityId: `post-${post.id}` }),
    actor: actorUri,
    to: PUBLIC_COLLECTION,
    ccs: ccList,
    published: getTemporal(post.publishedAt),
    object: new Article({
      id: ctx.getObjectUri(Article, { identifier, postId: String(post.id) }),
      attribution: actorUri,
      name: post.title,
      summary: post.content
        ? stripHtml(post.content).slice(0, 200) + "..."
        : undefined,
      content: post.content ?? undefined,
      published: getTemporal(post.publishedAt),
      to: PUBLIC_COLLECTION,
      ccs: ccList,
      url: getPostUrl(applicationUrl, identifier, post),
      tags: mentions.map(
        (m) => new Mention({ href: new URL(m.href), name: m.name })
      ),
    }),
  });
}

export function getPostUrl(
  applicationUrl: string,
  identifier: string,
  post: { urlSlug?: string | null; id: number }
): URL {
  return new URL(
    `/${identifier}/posts/${post.urlSlug ?? post.id}`,
    applicationUrl
  );
}

export const headersAreForActivityPub = (
  headers: IncomingHttpHeaders,
  method: "POST" | "GET" | "PUT" | "DELETE"
) => {
  const contentType = headers["content-type"];
  const accept = headers["accept"];

  const isActivityPubMimeType = (header: string | undefined) =>
    header?.includes("application/activity+json") ||
    header?.includes(
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    );

  if (method === "POST" || method === "PUT") {
    return isActivityPubMimeType(contentType) || isActivityPubMimeType(accept);
  }

  return isActivityPubMimeType(accept);
};

export const isValidActivityPubEndpoint = (path: string) => {
  return (
    /^\/v1\/ap\/artists\/[\w-]+(?:\/(?:outbox|followers|following|inbox|activities|posts|releases)(?:\/[\w-]+)?)?$/.test(
      path
    ) || /^\/.well-known\/(webfinger|nodeinfo)/.test(path)
  );
};
