import path from "node:path";

import prisma from "@mirlo/prisma";
import { Profile } from "@mirlo/prisma/client";
import pug from "pug";

import logger from "../logger";
import { getClient } from "../utils/getClient";
import { convertURLArrayToSizes } from "../utils/images";
import { coversPrefix } from "../utils/minio";

const renderWidgetCard = pug.compileFile(
  path.resolve("emails", "widget-card.pug")
);

const cardColors = (properties: Profile["properties"]) => ({
  button: properties?.colors?.button || "#be3455",
  background: properties?.colors?.background || "#f5f0f0",
  text: properties?.colors?.text || "#111",
});

const coverUrl = (cover?: { url: string[] } | null): string | null => {
  if (!cover || cover.url.length === 0) return null;
  const sizes = convertURLArrayToSizes(cover.url, coversPrefix) as Record<
    string,
    string
  >;
  return sizes["120"] || sizes["60"] || sizes["original"] || null;
};

/**
 * A trackGroup is unreachable to the public (and therefore to a post-email
 * recipient) if it's a draft, deleted, private, or not yet published. Used
 * by `parseOutIframes` to decide between linking to the trackGroup/track and
 * falling back to the post page that embeds it.
 */
const isTrackGroupUnreachable = (tg: {
  isHiddenTrackGroupForSongDrafts: boolean;
  deletedAt: Date | null;
  publishedAt: Date | null;
  isPublic?: boolean;
}) => {
  return (
    tg.isHiddenTrackGroupForSongDrafts ||
    tg.deletedAt !== null ||
    tg.publishedAt === null ||
    tg.publishedAt.getTime() > Date.now() ||
    tg.isPublic === false
  );
};

export const parseOutIframes = async (
  content: string,
  fallbackUrl?: string
) => {
  // Replace <iframe src="/widget/trackGroup/:id"> or <iframe src="/widget/track/:id">
  // with a div containing info about the trackGroup or track, fetching live data from the database

  // Find all iframes to process
  let htmlContent = content;
  try {
    const iframeRegex =
      /<iframe([^>]*)src=["']\/widget\/(trackGroup|track)\/(\d+)[^"']*["']([^>]*)><\/iframe>/gi;

    // Collect all matches
    const matches: Array<{ match: string; type: string; id: string }> = [];
    let match;
    while ((match = iframeRegex.exec(htmlContent)) !== null) {
      matches.push({
        match: match[0],
        type: match[2],
        id: match[3],
      });
    }

    // Fetch all needed trackGroups and tracks
    const trackGroupIds = matches
      .filter((m) => m.type === "trackGroup")
      .map((m) => Number(m.id));
    const trackIds = matches
      .filter((m) => m.type === "track")
      .map((m) => Number(m.id));

    const [trackGroups, tracks] = await Promise.all([
      trackGroupIds.length
        ? prisma.trackGroup.findMany({
            where: { id: { in: trackGroupIds } },
            include: { profile: true, tracks: true, cover: true },
          })
        : Promise.resolve([]),
      trackIds.length
        ? prisma.track.findMany({
            where: { id: { in: trackIds }, deletedAt: null },
            include: {
              trackGroup: { include: { profile: true, cover: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const trackGroupMap = Object.fromEntries(
      trackGroups.map((tg) => [tg.id, tg])
    );
    const trackMap = Object.fromEntries(tracks.map((t) => [t.id, t]));

    // Replace iframes with divs containing info
    const { applicationUrl } = await getClient();
    htmlContent = htmlContent.replace(
      iframeRegex,
      (_match, _before, type, id, _after) => {
        if (type === "trackGroup" && trackGroupMap[id]) {
          const tg = trackGroupMap[id];
          return renderWidgetCard({
            type,
            id,
            ...cardColors(tg.profile.properties),
            cover: coverUrl(tg.cover),
            title: tg.title,
            artistName: tg.profile?.name || "Unknown",
            artistUrl: `${applicationUrl}/${tg.profile.urlSlug}`,
            trackCount: tg.tracks.length,
            // If the trackGroup is unreachable (draft/private/deleted/unreleased),
            // fall back to the post URL so the recipient lands somewhere that
            // actually plays the track. See #1703.
            url:
              fallbackUrl && isTrackGroupUnreachable(tg)
                ? fallbackUrl
                : `${applicationUrl}/${tg.profile.urlSlug}/release/${tg.urlSlug}`,
          });
        } else if (type === "track" && trackMap[id]) {
          const t = trackMap[id];
          return renderWidgetCard({
            type,
            id,
            ...cardColors(t.trackGroup.profile.properties),
            cover: coverUrl(t.trackGroup.cover),
            title: t.title,
            artistName: t.trackGroup.profile?.name || "Unknown",
            artistUrl: `${applicationUrl}/${t.trackGroup.profile.urlSlug}`,
            // Same fallback as the trackGroup branch: when a track's parent
            // album is unreachable to the public, link to the post that embeds
            // the track instead of an unreachable URL.
            url:
              fallbackUrl && isTrackGroupUnreachable(t.trackGroup)
                ? fallbackUrl
                : `${applicationUrl}/${t.trackGroup.profile.urlSlug}/release/${t.trackGroup.urlSlug}/track/${t.urlSlug}`,
          });
        }
        // If not found, fallback to a placeholder
        return `<div data-type="${type}" data-id="${id}"></div>`;
      }
    );
  } catch (error) {
    logger.error(`parseOutIframes: failed to parse content`);
    logger.error(error);
    // If there's an error, return the original content
  }

  return htmlContent;
};
