import fs from "fs";
import path from "node:path";

import prisma from "@mirlo/prisma";
import { Client } from "@mirlo/prisma/client";
import * as cheerio from "cheerio";
import { Request } from "express";

import {
  fetchArtistMetadata,
  fetchAlbumMetadata,
  fetchPostMetadata,
  fetchMerchMetadata,
} from "./parseIndex/metadata";
import { matchRoute as matchRoutePattern } from "./parseIndex/routeMatcher";
import { getClient } from "./utils/getClient";
import { generateFullStaticImageUrl } from "./utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalCoversBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
} from "./utils/minio";
import {
  USER_PROFILE_SELECT,
  serializeUserProfile,
} from "./utils/serialize/userProfile";
import { getSiteSettings } from "./utils/settings";
import { whereForPublishedTrackGroups } from "./utils/trackGroup";

type RouteParams = Record<string, string | number | undefined>;

type RouteContext<T extends RouteParams = RouteParams> = {
  $: cheerio.CheerioAPI;
  client: Client;
  avatarUrl?: string;
  params: T;
};

type RouteHandler<T extends RouteParams = RouteParams> = (
  context: RouteContext<T>
) => Promise<void>;

type PageMetadata = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  isAlbum?: boolean;
  isSong?: boolean;
  isPlayer?: string;
  rss?: string;
  color?: string;
  artistName?: string;
  artistUrl?: string;
  releaseDate?: string;
  duration?: number;
  trackCount?: number;
  tracks?: Array<{ title: string; duration?: number; url: string }>;
  schemas?: string[];
};

const determineType = (metadata: PageMetadata) => {
  if (metadata.isAlbum) {
    return "music.album";
  }
  if (metadata.isSong) {
    return "music.song";
  }
  return "article";
};

// Helper function to safely escape strings for JSON
const escapeJsonString = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

// Build MusicAlbum schema for albums
const buildMusicAlbumSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    artistUrl,
    releaseDate,
    trackCount = 0,
    tracks = [],
  } = metadata;

  const trackListItems = tracks
    .map(
      (track, index) => `{
      "@type": "MusicRecording",
      "position": ${index + 1},
      "name": "${escapeJsonString(track.title)}",
      "url": "${track.url}"
      ${track.duration ? `,"duration": "PT${track.duration}S"` : ""}
    }`
    )
    .join(",");

  return `{
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    "byArtist": {
      "@type": "MusicGroup",
      "name": "${escapeJsonString(artistName || "")}",
      "url": "${artistUrl || ""}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}",
    "numberOfTracks": ${trackCount},
    "track": [${trackListItems}]
  }`;
};

// Build MusicRecording schema for individual tracks
const buildMusicRecordingSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    artistUrl,
    releaseDate,
    duration,
  } = metadata;

  const durationString = duration ? `"duration": "PT${duration}S",` : "";

  return `{
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    ${durationString}
    "byArtist": {
      "@type": "MusicGroup",
      "name": "${escapeJsonString(artistName || "")}",
      "url": "${artistUrl || ""}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}"
  }`;
};

// Build MusicGroup schema for artist profiles
const buildMusicGroupSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, artistUrl } = metadata;

  return `{
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${artistUrl || url}",
    "image": "${imageUrl || ""}"
  }`;
};

// Build BlogPosting schema for posts and general articles
const buildArticleSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, artistName, releaseDate } =
    metadata;

  return `{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    "author": {
      "@type": "Person",
      "name": "${escapeJsonString(artistName || "Mirlo Artist")}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}"
  }`;
};

export const getTrackGroupWidget = (client: Client, trackGroupId: number) => {
  return `${client.applicationUrl}/widget/trackGroup/${trackGroupId}`;
};

export const getTrackWidget = (client: Client, trackId: number) => {
  return `${client.applicationUrl}/widget/track/${trackId}`;
};

const buildOpenGraphTags = ($: cheerio.CheerioAPI, metadata: PageMetadata) => {
  const {
    title,
    description,
    url,
    imageUrl,
    rss,
    isAlbum,
    isPlayer,
    color = "#be3455",
    schemas = [],
  } = metadata;

  // Truncate description to 160 chars for meta description (SERP snippet)
  const metaDescription =
    description.length > 160
      ? description.substring(0, 160) + "..."
      : description;

  $("head").append(`
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="${determineType(metadata)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta name="description" content="${metaDescription}">
    <meta property="og:site_name" content="${title}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:card" content="${isAlbum ? "player" : "summary"}" />

    <meta property="og:image" content="${imageUrl ? imageUrl : "/android-chrome-512x512.png"}" />
    <meta name="twitter:image" content="${imageUrl ? imageUrl : "/android-chrome-512x512.png"}" />
    <meta name="theme-color" content="${metadata.color}" />
    <meta name="msapplication-TileColor" content="${metadata.color}" />

    ${rss ? `<link rel="alternate" type="application/rss+xml" href="${rss}" />` : ""}
    <link rel="alternate" type="application/json+oembed" href="${process.env.API_DOMAIN}/v1/oembed?url=${encodeURIComponent(url)}" title="oEmbed" />
    ${
      isPlayer
        ? `
        <meta name="medium" content="video" />
        <meta name="video_height" content="140" />
        <meta name="video_width" content="400" />
        <meta name="generator" content="Mirlo" />
        <meta name="video_type" content="application/x-shockwave-flash" /><!-- Does this work -->
        <meta property="og:video:height" content="140" />
        <meta property="og:video:width" content="400" />
        <meta property="og:video" content="${isPlayer}" /> 
        <meta property="og:video:type" content="text/html" /> 
        <meta property="og:video:secure_url" content="${isPlayer}" />
        <meta property="twitter:player" content="${isPlayer}" /> 
        <meta property="twitter:player:height" content="140" />
        <meta property="twitter:player:width" content="400" />
    `
        : ""
    }
    ${schemas.map((schema) => `<script type="application/ld+json">${schema}</script>`).join("\n    ")}
  `);
};

const mirloDefaultDescription = "Buy and sell music directly from musicians.";

const handleReleasesPage: RouteHandler<{}> = async ({ $, client }) => {
  buildOpenGraphTags($, {
    title: "Mirlo Releases",
    description: "The latest releases on Mirlo",
    url: `${client.applicationUrl}/releases`,
    imageUrl: `${client.applicationUrl}/images/mirlo-typeface.png`,
    rss: `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`,
  });
};

type ArtistParams = { artistSlug: string };
const handleArtistProfile: RouteHandler<ArtistParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistUrl = `${client.applicationUrl}/${artist.urlSlug}`;
  const schema = buildMusicGroupSchema({
    title: artist.name ?? "A Mirlo Artist",
    description: artist.bio ?? "An artist on Mirlo",
    url: artistUrl,
    imageUrl: avatarUrl,
    artistUrl: artistUrl,
  });

  buildOpenGraphTags($, {
    title: artist.name ?? "A Mirlo Artist",
    description: artist.bio ?? "An artist on Mirlo",
    url: artistUrl,
    imageUrl: avatarUrl,
    artistName: artist.name,
    schemas: [schema],
  });
};

type PostParams = { artistSlug: string; postId?: number; postSlug?: string };
const handlePost: RouteHandler<PostParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug, postId, postSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistName = artist.name ?? "A Mirlo Artist";
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  // Try to find specific post
  const post = postId
    ? await fetchPostMetadata(artistSlug, { id: postId })
    : postSlug
      ? await fetchPostMetadata(artistSlug, { slug: postSlug })
      : null;

  if (post) {
    const hasTracks = post.tracks.length > 0;
    const postUrl = `${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}`;
    const postDescription = `A post by ${artistName}`;
    const postCreatedDate = post.createdAt
      ? post.createdAt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const schema = buildArticleSchema({
      title: post.title,
      description: postDescription,
      url: postUrl,
      imageUrl: post.featuredImage
        ? generateFullStaticImageUrl(
            post.featuredImage.id,
            finalPostImageBucket,
            post.featuredImage.extension
          )
        : avatarUrl,
      artistName: artistName,
      releaseDate: postCreatedDate,
    });

    buildOpenGraphTags($, {
      title: post.title,
      rss,
      description: postDescription,
      url: postUrl,
      imageUrl: post.featuredImage
        ? generateFullStaticImageUrl(
            post.featuredImage.id,
            finalPostImageBucket,
            post.featuredImage.extension
          )
        : avatarUrl,
      isPlayer: hasTracks
        ? getTrackWidget(client, post.tracks[0].trackId)
        : undefined,
      artistName: artistName,
      releaseDate: postCreatedDate,
      schemas: [schema],
    });
  } else {
    // Index of all posts
    buildOpenGraphTags($, {
      title: artistName,
      rss,
      description: `All posts by ${artistName} on Mirlo`,
      url: `${client.applicationUrl}/${artist?.urlSlug}/posts`,
      imageUrl: avatarUrl,
    });
  }
};

type MerchParams = { artistSlug: string; merchId?: string };
const handleMerch: RouteHandler<MerchParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug, merchId },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistName = artist.name ?? "A Mirlo Artist";
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  // Try to find specific merch - first try as ID, then as slug
  let merch = null;
  if (merchId) {
    try {
      merch = await fetchMerchMetadata(artistSlug, { id: merchId });
    } catch {
      // ID format invalid (not a UUID), try as slug
      merch = await fetchMerchMetadata(artistSlug, { slug: merchId });
    }
  }

  if (merch) {
    const coverString = merch.images?.[0]?.url.find((u) => u.includes("x600"));
    const merchUrl = `${client.applicationUrl}/${merch.artist?.urlSlug}/merch/${merch.id}`;
    const merchDescription = `Merch by ${artistName}`;

    const schema = buildArticleSchema({
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalMerchImageBucket)
        : avatarUrl,
      artistName: artistName,
    });

    buildOpenGraphTags($, {
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalMerchImageBucket)
        : avatarUrl,
      rss,
      artistName: artistName,
      schemas: [schema],
    });
  } else {
    // Index of all merch
    buildOpenGraphTags($, {
      title: `${artistName} merch`,
      description: `All merch by ${artistName} on Mirlo`,
      url: `${client.applicationUrl}/${artist?.urlSlug}/merch`,
      imageUrl: avatarUrl,
      rss,
    });
  }
};

type AlbumParams = {
  artistSlug: string;
  albumSlug?: string;
  trackId?: number;
};
const handleAlbum: RouteHandler<AlbumParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug, albumSlug, trackId },
}) => {
  if (!albumSlug) {
    // /artist/releases index - handled by artist profile
    return;
  }

  const tg = await fetchAlbumMetadata(artistSlug, albumSlug);
  if (!tg) return;

  // Check if it's a specific track
  if (trackId) {
    const track = tg.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const coverString = tg.cover?.url.find((u) => u.includes("x600"));
    const trackUrl = `${client.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}/tracks/${track.id}`;
    const releaseDate = tg.releaseDate?.toISOString().split("T")[0] || "";

    const schema = buildMusicRecordingSchema({
      title: track.title ?? "A track on Mirlo",
      description: `A track by ${tg.artist.name}\nReleased ${releaseDate}`,
      url: trackUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      artistName: tg.artist.name,
      artistUrl: `${client.applicationUrl}/${tg.artist?.urlSlug}`,
      releaseDate: releaseDate,
      duration: track.audio?.duration || undefined,
    });

    buildOpenGraphTags($, {
      title: track.title ?? "A track on Mirlo",
      description: `A track by ${tg.artist.name}\nReleased ${releaseDate}`,
      url: trackUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      isSong: true,
      isPlayer: getTrackWidget(client, track.id),
      artistName: tg.artist.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  } else {
    // Album page
    const coverString = tg.cover?.url.find((u) => u.includes("x600"));
    const releaseDate = tg.releaseDate?.toISOString().split("T")[0] || "";
    const albumUrl = `${client.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}`;

    const tracksList = tg.tracks.map((track) => ({
      title: track.title ?? "Untitled Track",
      duration: track.audio?.duration || undefined,
      url: `${albumUrl}/tracks/${track.id}`,
    }));

    let description = `An album by ${tg.artist.name}\nReleased ${releaseDate}`;

    if (tg.about) {
      description += `\n${tg.about}`;
    }

    const schema = buildMusicAlbumSchema({
      title: tg.title ?? "Mirlo Album",
      description: description,
      url: albumUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      artistName: tg.artist.name,
      artistUrl: `${client.applicationUrl}/${tg.artist?.urlSlug}`,
      releaseDate: releaseDate,
      trackCount: tg.tracks.length,
      tracks: tracksList,
    });

    buildOpenGraphTags($, {
      title: tg.title ?? "Mirlo Album",
      description: description,
      url: albumUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      isAlbum: true,
      isPlayer: getTrackGroupWidget(client, tg.id),
      artistName: tg.artist.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  }
};

type SupportParams = { artistSlug: string };
const handleSupport: RouteHandler<SupportParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistName = artist.name ?? "A Mirlo Artist";
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  buildOpenGraphTags($, {
    title: artistName,
    description: `Support ${artistName} on Mirlo`,
    url: `${client.applicationUrl}/${artist?.urlSlug}/support`,
    imageUrl: avatarUrl,
    rss,
  });
};

type ArtistReleasesParams = { artistSlug: string };
const handleArtistReleases: RouteHandler<ArtistReleasesParams> = async ({
  $,
  client,
  avatarUrl,
  params: { artistSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistName = artist.name ?? "A Mirlo Artist";
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  buildOpenGraphTags($, {
    title: `${artistName} releases`,
    description: `All releases by ${artistName} on Mirlo`,
    url: `${client.applicationUrl}/${artist?.urlSlug}/releases`,
    imageUrl: avatarUrl,
    rss,
  });
};

type AuthPageType = "login" | "signup";
type AuthParams = { pageType: AuthPageType };
const handleAuthPage: RouteHandler<AuthParams> = async ({
  $,
  client,
  params: { pageType },
}) => {
  const title = pageType === "login" ? "Log in to Mirlo" : "Sign up to Mirlo";
  buildOpenGraphTags($, {
    title,
    description: mirloDefaultDescription,
    url: `${client.applicationUrl}/${pageType}`,
  });
};

const handleDefault: RouteHandler<{}> = async ({ $, client }) => {
  buildOpenGraphTags($, {
    title: "Mirlo",
    description: mirloDefaultDescription,
    url: client.applicationUrl,
  });
};

/**
 * Resolve the og:image URL for an artist using a fallback chain
 */
const resolveArtistImageUrl = (artist: {
  avatar?: { url: string[] } | null;
  background?: { url: string[] } | null;
  trackGroups?: Array<{ cover?: { url: string[] } | null }>;
}): string | undefined => {
  // Try avatar first
  const avatarString = artist.avatar?.url.find((u) => u.includes("x600"));
  if (avatarString) {
    return generateFullStaticImageUrl(avatarString, finalArtistAvatarBucket);
  }

  // Fall back to background
  const backgroundString = artist.background?.url.find((u) =>
    u.includes("x625")
  );
  if (backgroundString) {
    return generateFullStaticImageUrl(
      backgroundString,
      finalArtistBackgroundBucket
    );
  }

  // Fall back to first album cover
  if (
    artist.trackGroups?.[0]?.cover?.url &&
    artist.trackGroups[0].cover.url.length > 0
  ) {
    const coverString = artist.trackGroups[0].cover.url.find((u) =>
      u.includes("x600")
    );
    if (coverString) {
      return generateFullStaticImageUrl(coverString, finalCoversBucket);
    }
  }

  return undefined;
};

const dispatchRoute = async (
  routeParams: Record<string, any>,
  context: Omit<RouteContext, "params">
): Promise<void> => {
  const routeType = routeParams.type as string;

  switch (routeType) {
    case "releases":
      await handleReleasesPage(context as RouteContext);
      break;
    case "auth":
      await handleAuthPage({
        ...context,
        params: { pageType: routeParams.pageType as AuthPageType },
      });
      break;
    case "track":
      await handleAlbum({
        ...context,
        params: {
          artistSlug: routeParams.artistSlug,
          albumSlug: routeParams.albumSlug,
          trackId: routeParams.trackId,
        },
      });
      break;
    case "album":
      await handleAlbum({
        ...context,
        params: {
          artistSlug: routeParams.artistSlug,
          albumSlug: routeParams.albumSlug,
        },
      });
      break;
    case "post":
      await handlePost({
        ...context,
        params: {
          artistSlug: routeParams.artistSlug,
          postId: routeParams.postId,
          postSlug: routeParams.postSlug,
        },
      });
      break;
    case "posts-index":
      await handlePost({
        ...context,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "merch":
      await handleMerch({
        ...context,
        params: {
          artistSlug: routeParams.artistSlug,
          merchId: routeParams.merchId,
        },
      });
      break;
    case "merch-index":
      await handleMerch({
        ...context,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "support":
      await handleSupport({
        ...context,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "artist-releases":
      await handleArtistReleases({
        ...context,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "artist":
      await handleArtistProfile({
        ...context,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    default:
      // Unknown route type
      break;
  }
};

export const analyzePathAndGenerateHTML = async (
  pathname: string,
  $: cheerio.CheerioAPI,
  req?: Request
) => {
  const segments = pathname.split("/").filter(Boolean);
  try {
    const client = await getClient();
    // Inject logged-in user state so the client doesn't need to wait for /auth/profile
    if (req?.user) {
      const user = await prisma.user.findFirst({
        where: { email: (req.user as { email: string }).email },
        select: USER_PROFILE_SELECT,
      });
      if (user) {
        $("head").append(
          `<script id="__MIRLO_AUTH__" type="application/json">${JSON.stringify({ user: serializeUserProfile(user), injectedAt: new Date().toISOString() })}</script>`
        );
      }
    }

    // Try to fetch avatar if artist exists
    let avatarUrl: string | undefined;
    const artist = await prisma.artist.findFirst({
      where: { urlSlug: segments[0] },
      include: {
        avatar: true,
        background: true,
        trackGroups: {
          where: whereForPublishedTrackGroups(),
          include: { cover: true },
          take: 1,
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (artist) {
      avatarUrl = resolveArtistImageUrl(artist);
    }

    // Match against route patterns using shared matcher
    const routeParams = matchRoutePattern(segments);
    if (routeParams) {
      await dispatchRoute(routeParams, { $, client, avatarUrl });
    } else {
      // No matching route - use default
      await handleDefault({ $, client, params: {} });
    }
  } catch (error) {
    console.error("Error in analyzePathAndGenerateHTML:", error);
    // Silently fail - don't crash page rendering
  }

  const settings = await getSiteSettings();

  $("title").after(`
    <style>
    html {
      --mi-instance-button-color: ${settings.settings?.instanceCustomization?.colors?.button ?? "#be3455"};
      --mi-instance-button-text-color: ${settings.settings?.instanceCustomization?.colors?.buttonText ?? "#ffffff"};
      --mi-instance-background-color: ${settings.settings?.instanceCustomization?.colors?.background ?? "#ffffff"};
      --mi-instance-text-color: ${settings.settings?.instanceCustomization?.colors?.text ?? "#000000"};
      --mi-instance-show-hero-on-home: ${settings.settings?.instanceCustomization?.showHeroOnHome ? "flex" : "none"};
    }
    </style>
  `);

  return $;
};

/**
 * FIXME: make this function a little more sane. Also write tests for it.
 * @param pathname
 * @returns
 */
const parseIndex = async (pathname: string, req?: Request) => {
  const fileLocation = path.join(
    __dirname,
    "..",
    "client",
    "dist",
    "index.html" // We fetch the index.html file
  );

  let buffer;
  try {
    buffer = await fs.readFileSync(fileLocation);
  } catch (e) {
    return "<html>No built client</html>";
  }
  const $ = cheerio.load(buffer);
  await analyzePathAndGenerateHTML(pathname, $, req);
  return $.html();
};

export default parseIndex;
