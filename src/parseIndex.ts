import fs from "fs";
import path from "node:path";

import prisma from "@mirlo/prisma";
import { Client, User } from "@mirlo/prisma/client";
import * as cheerio from "cheerio";
import { Request } from "express";

import {
  registerArtistHydration,
  registerPostHydration,
  registerTrackGroupHydration,
  registerTrackHydration,
  appendHydrationScript,
  HydrationData,
} from "./parseIndex/hydrations";
import {
  fetchArtistMetadata,
  fetchAlbumMetadata,
  fetchPostMetadata,
  fetchMerchMetadata,
} from "./parseIndex/metadata";
import { matchRoute as matchRoutePattern } from "./parseIndex/routeMatcher";
import {
  buildMusicGroupSchema,
  buildArticleSchema,
  buildMusicRecordingSchema,
  buildMusicAlbumSchema,
} from "./parseIndex/schemas";
import {
  getPostWidget,
  getTrackGroupWidget,
  getTrackWidget,
} from "./parseIndex/widgetUrls";
import { checkIsUserSubscriber } from "./utils/artist";
import { getClient } from "./utils/getClient";
import { generateFullStaticImageUrl } from "./utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalCoversBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
} from "./utils/minio";
import { processSingleArtist } from "./utils/serialize/artist";
import { postIncludeForUser } from "./utils/serialize/post";
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
  req?: Request;
  hydrations: HydrationData[];
};

type RouteHandler<T extends RouteParams = RouteParams> = (
  context: RouteContext<T>
) => Promise<void>;

type PlayerEmbed = {
  url: string;
  width: number;
  height: number;
};

export type PageMetadata = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  isAlbum?: boolean;
  isSong?: boolean;
  ogVideo?: PlayerEmbed;
  twitterPlayer?: PlayerEmbed;
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

const mirloDefaultDescription = "Buy and sell music directly from musicians.";
const mirloDefaultImagePath = "default-meta-image.webp";

const buildOpenGraphTags = ($: cheerio.CheerioAPI, metadata: PageMetadata) => {
  const {
    title,
    description,
    url,
    imageUrl,
    rss,
    isAlbum,
    ogVideo,
    twitterPlayer,
    artistName,
    schemas = [],
  } = metadata;

  // Truncate description to 160 chars for meta description (SERP snippet)
  const metaDescription =
    description.length > 160
      ? description.substring(0, 160) + "..."
      : description;

  $("head").append(`
    <link rel="canonical" href="${url}" />
    <link rel="alternate" href="/v1/federatedStreaming" type="application/canimus+json" title="Canimus feed (JSON)"/>
    <meta property="og:type" content="${determineType(metadata)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta name="description" content="${metaDescription}">
    <meta property="og:site_name" content="${artistName || "Mirlo"}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:card" content="${isAlbum || twitterPlayer ? "player" : "summary"}" />

    <meta property="og:image" content="${imageUrl ? imageUrl : "/" + mirloDefaultImagePath}" />
    <meta name="twitter:image" content="${imageUrl ? imageUrl : "/" + mirloDefaultImagePath}" />
    <meta name="theme-color" content="${metadata.color}" />
    <meta name="msapplication-TileColor" content="${metadata.color}" />

    ${rss ? `<link rel="alternate" type="application/rss+xml" href="${rss}" />` : ""}
    <link rel="alternate" type="application/json+oembed" href="${process.env.API_DOMAIN}/v1/oembed?url=${encodeURIComponent(url)}" title="oEmbed" />
    ${
      ogVideo
        ? `
        <meta name="medium" content="video" />
        <meta name="video_height" content="${ogVideo.height}" />
        <meta name="video_width" content="${ogVideo.width}" />
        <meta name="generator" content="Mirlo" />
        <meta property="og:video:height" content="${ogVideo.height}" />
        <meta property="og:video:width" content="${ogVideo.width}" />
        <meta property="og:video" content="${ogVideo.url}" />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:secure_url" content="${ogVideo.url}" />
    `
        : ""
    }
    ${
      twitterPlayer
        ? `
        <meta property="twitter:player" content="${twitterPlayer.url}" />
        <meta property="twitter:player:height" content="${twitterPlayer.height}" />
        <meta property="twitter:player:width" content="${twitterPlayer.width}" />
    `
        : ""
    }
    ${schemas.map((schema) => `<script type="application/ld+json">${schema}</script>`).join("\n    ")}
  `);
};

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
  hydrations,
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

  registerArtistHydration(hydrations, artist);

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
  req,
  hydrations,
  params: { artistSlug, postId, postSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

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
      ogVideo: hasTracks
        ? {
            url: getPostWidget(client, post.id),
            width: 560,
            height: 315,
          }
        : undefined,
      twitterPlayer: hasTracks
        ? {
            url: getPostWidget(client, post.id),
            width: 560,
            height: 315,
          }
        : undefined,
      artistName: artistName,
      releaseDate: postCreatedDate,
      schemas: [schema],
    });

    // Hydrate the public Post page so the client renders without a load
    // flash on direct page load (mirrors the `__MIRLO_AUTH__` user-hydration
    // pattern). Refetched as a single full post with user-scoped purchase
    // info so `serializePost` produces the same shape as `/v1/posts/{id}`.
    const user = req?.user as User | undefined;
    const userId = user?.id;
    const fullPost = await prisma.post.findFirst({
      where: {
        id: post.id,
        publishedAt: { lte: new Date() },
        isDraft: false,
      },
      include: postIncludeForUser(userId),
    });
    if (fullPost) {
      try {
        const isUserSubscriber = await checkIsUserSubscriber(
          user,
          fullPost.artistId
        );
        registerPostHydration(hydrations, fullPost);
      } catch (err) {
        console.error("Error appending __MIRLO_POST__:", err);
      }
    }
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
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

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
  params: { artistSlug, albumSlug, trackId },
  hydrations,
}) => {
  if (!albumSlug) {
    // /artist/releases index - handled by artist profile
    return;
  }

  const tg = await fetchAlbumMetadata(artistSlug, albumSlug);
  if (!tg) return;

  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);
  registerTrackGroupHydration(hydrations, tg);

  // Check if it's a specific track
  if (trackId) {
    const track = tg.tracks.find((t) => t.id === trackId);
    if (!track) return;

    registerTrackHydration(hydrations, track);

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
      ogVideo: {
        url: getTrackWidget(client, track.id),
        width: 400,
        height: 140,
      },
      twitterPlayer: {
        url: getTrackWidget(client, track.id, "card"),
        width: 560,
        height: 315,
      },
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
      ogVideo: {
        url: getTrackGroupWidget(client, tg.id),
        width: 400,
        height: 140,
      },
      twitterPlayer: {
        url: getTrackGroupWidget(client, tg.id, "card"),
        width: 560,
        height: 315,
      },
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
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

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
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

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
    imageUrl: `${client.applicationUrl}/${mirloDefaultImagePath}`,
  });
};

const handleDefault: RouteHandler<{}> = async ({ $, client }) => {
  buildOpenGraphTags($, {
    title: "Mirlo",
    description: mirloDefaultDescription,
    url: client.applicationUrl,
    imageUrl: `${client.applicationUrl}/${mirloDefaultImagePath}`,
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

type TrackWidgetParams = { trackId: number };
const handleTrackWidget: RouteHandler<TrackWidgetParams> = async ({
  $,
  params: { trackId },
  hydrations,
}) => {
  const track = await prisma.track.findFirst({
    where: { id: trackId },
    include: {
      trackGroup: {
        include: {
          artist: { include: { avatar: { where: { deletedAt: null } } } },
          cover: { where: { deletedAt: null } },
        },
      },
      trackArtists: true,
      audio: true,
    },
  });
  if (!track) return;

  const artist = await prisma.artist.findFirst({
    where: { id: track.trackGroup.artistId },
    include: {
      avatar: { where: { deletedAt: null } },
      background: { where: { deletedAt: null } },
    },
  });

  registerTrackHydration(hydrations, track);

  if (artist) {
    registerArtistHydration(hydrations, artist);
  }
};

type TrackGroupWidgetParams = { trackGroupId: number };
const handleTrackGroupWidget: RouteHandler<TrackGroupWidgetParams> = async ({
  $,
  params: { trackGroupId },
  hydrations,
}) => {
  const trackGroup = await prisma.trackGroup.findFirst({
    where: { id: trackGroupId },
    include: {
      tracks: {
        where: { deletedAt: null, audio: { uploadState: "SUCCESS" } },
        include: { audio: true, trackArtists: true, license: true },
        orderBy: { order: "asc" },
      },
      artist: {
        include: {
          avatar: { where: { deletedAt: null } },
        },
      },
      cover: { where: { deletedAt: null } },
      tags: { include: { tag: true } },
      fundraiser: true,
    },
  });
  if (!trackGroup) return;

  const artist = await prisma.artist.findFirst({
    where: { id: trackGroup.artistId },
    include: {
      avatar: { where: { deletedAt: null } },
      background: { where: { deletedAt: null } },
    },
  });
  registerTrackGroupHydration(hydrations, trackGroup);

  if (artist) {
    appendHydrationScript($, "__MIRLO_ARTIST__", artist.id, {
      artist: processSingleArtist(artist),
    });
  }
};

const dispatchRoute = async (
  routeParams: Record<string, any>,
  context: Omit<RouteContext, "params" | "hydrations">
): Promise<void> => {
  const hydrations: HydrationData[] = [];
  const contextWithHydrations = { ...context, hydrations };
  const routeType = routeParams.type as string;

  switch (routeType) {
    case "releases":
      await handleReleasesPage(contextWithHydrations as RouteContext);
      break;
    case "auth":
      await handleAuthPage({
        ...contextWithHydrations,
        params: { pageType: routeParams.pageType as AuthPageType },
      });
      break;
    case "track":
      await handleAlbum({
        ...contextWithHydrations,
        params: {
          artistSlug: routeParams.artistSlug,
          albumSlug: routeParams.albumSlug,
          trackId: routeParams.trackId,
        },
      });
      break;
    case "album":
      await handleAlbum({
        ...contextWithHydrations,
        params: {
          artistSlug: routeParams.artistSlug,
          albumSlug: routeParams.albumSlug,
        },
      });
      break;
    case "post":
      await handlePost({
        ...contextWithHydrations,
        params: {
          artistSlug: routeParams.artistSlug,
          postId: routeParams.postId,
          postSlug: routeParams.postSlug,
        },
      });
      break;
    case "posts-index":
      await handlePost({
        ...contextWithHydrations,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "merch":
      await handleMerch({
        ...contextWithHydrations,
        params: {
          artistSlug: routeParams.artistSlug,
          merchId: routeParams.merchId,
        },
      });
      break;
    case "merch-index":
      await handleMerch({
        ...contextWithHydrations,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "support":
      await handleSupport({
        ...contextWithHydrations,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "artist-releases":
      await handleArtistReleases({
        ...contextWithHydrations,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "artist":
      await handleArtistProfile({
        ...contextWithHydrations,
        params: { artistSlug: routeParams.artistSlug },
      });
      break;
    case "widget-track":
      await handleTrackWidget({
        ...contextWithHydrations,
        params: { trackId: routeParams.trackId as number },
      });
      break;
    case "widget-trackgroup":
      await handleTrackGroupWidget({
        ...contextWithHydrations,
        params: { trackGroupId: routeParams.trackGroupId as number },
      });
      break;
    default:
      // Unknown route type
      break;
  }

  // Apply all registered hydrations
  hydrations.forEach((hydration) => {
    appendHydrationScript(
      contextWithHydrations.$,
      hydration.scriptId,
      hydration.objectId,
      hydration.data,
      hydration.artistId
    );
  });
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
        appendHydrationScript($, "__MIRLO_AUTH__", user.id, {
          user: serializeUserProfile(user),
        });
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
      await dispatchRoute(routeParams, { $, client, avatarUrl, req });
    } else {
      // No matching route - use default
      await handleDefault({ $, client, hydrations: [], params: {} });
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
