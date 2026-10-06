import fs from "fs";
import path from "node:path";

import prisma from "@mirlo/prisma";
import { Client, User } from "@mirlo/prisma/client";
import * as cheerio from "cheerio";
import { Request } from "express";

import { findActivityPubAlternate } from "./activityPub/pageAlternate";
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
  fetchSubscriptionTierMetadata,
} from "./parseIndex/metadata";
import {
  matchRoute as matchRoutePattern,
  splitPathIntoSegments,
} from "./parseIndex/routeMatcher";
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
import { processSingleArtist } from "./serializers/artist";
import { serializeInstanceSettings } from "./serializers/instanceSettings";
import { postIncludeForUser } from "./serializers/post";
import { resolveProfileImageUrl, whereForVisibleProfile } from "./utils/artist";
import { getClient } from "./utils/getClient";
import { generateFullStaticImageUrl } from "./utils/images";
import { merchImageUrl } from "./utils/merch";
import {
  finalCoversBucket,
  finalImageBucket,
  finalPostImageBucket,
} from "./utils/minio";
import {
  getCanUserSeePostContent,
  loadPurchasesForPostTracks,
} from "./utils/postAccess";
import { getSiteSettings, resolveInstanceName } from "./utils/settings";
import {
  whereForPublishedTrackGroups,
  whereForVisibleTrackGroup,
} from "./utils/trackGroup";
import { getAvailableLanguages } from "./utils/transifexLanguages";
import { serializeLoggedInUser, userSelect } from "./utils/user";

type RouteParams = Record<string, string | number | undefined>;

type RouteContext<T extends RouteParams = RouteParams> = {
  $: cheerio.CheerioAPI;
  client: Client;
  instanceName: string;
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

const buildOpenGraphTags = (
  $: cheerio.CheerioAPI,
  instanceName: string,
  metadata: PageMetadata
) => {
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
    <meta property="og:type" content="${determineType(metadata)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta name="description" content="${metaDescription}">
    <meta property="og:site_name" content="${artistName || instanceName}">
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

const handleReleasesPage: RouteHandler<{}> = async ({
  $,
  client,
  instanceName,
}) => {
  buildOpenGraphTags($, instanceName, {
    title: `${instanceName} Releases`,
    description: `The latest releases on ${instanceName}`,
    url: `${client.applicationUrl}/releases`,
    imageUrl: `${client.applicationUrl}/images/mirlo-typeface.png`,
    rss: `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`,
  });
};

type ArtistParams = { artistSlug: string };
const handleArtistProfile: RouteHandler<ArtistParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { artistSlug },
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  const artistUrl = `${client.applicationUrl}/${artist.urlSlug}`;
  const schema = buildMusicGroupSchema({
    title: artist.name ?? `A ${instanceName} Artist`,
    description: artist.bio ?? `An artist on ${instanceName}`,
    url: artistUrl,
    imageUrl: avatarUrl,
    artistUrl: artistUrl,
  });

  registerArtistHydration(hydrations, artist);

  buildOpenGraphTags($, instanceName, {
    title: artist.name ?? `A ${instanceName} Artist`,
    description: artist.bio ?? `An artist on ${instanceName}`,
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
  instanceName,
  avatarUrl,
  req,
  hydrations,
  params: { artistSlug, postId, postSlug },
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

  const artistName = artist.name ?? `A ${instanceName} Artist`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  // Try to find specific post
  const post = postId
    ? await fetchPostMetadata(artistSlug, { id: postId })
    : postSlug
      ? await fetchPostMetadata(artistSlug, { slug: postSlug })
      : null;

  if (post) {
    const hasTracks = post.tracks.length > 0;
    const postUrl = `${client.applicationUrl}/${post.profile?.urlSlug}/posts/${post.id}`;
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

    buildOpenGraphTags($, instanceName, {
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
        OR: [{ profileId: null }, { profile: whereForVisibleProfile() }],
      },
      include: postIncludeForUser(userId),
    });
    if (fullPost) {
      try {
        const canSeeContent = await getCanUserSeePostContent(user, fullPost);
        const { userTrackGroupPurchases, userTrackPurchases } =
          await loadPurchasesForPostTracks(user, fullPost);
        registerPostHydration(
          hydrations,
          fullPost,
          userTrackGroupPurchases,
          userTrackPurchases,
          canSeeContent
        );
      } catch (err) {
        console.error("Error appending __MIRLO_POST__:", err);
      }
    }
  } else {
    // Index of all posts
    buildOpenGraphTags($, instanceName, {
      title: artistName,
      rss,
      description: `All posts by ${artistName} on ${instanceName}`,
      url: `${client.applicationUrl}/${artist?.urlSlug}/posts`,
      imageUrl: avatarUrl,
    });
  }
};

type MerchParams = { artistSlug: string; merchId?: string };
const handleMerch: RouteHandler<MerchParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { artistSlug, merchId },
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

  const artistName = artist.name ?? `A ${instanceName} Artist`;
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
    const coverUrl = merchImageUrl(merch.images?.[0], 600);
    const merchUrl = `${client.applicationUrl}/${merch.profile?.urlSlug}/merch/${merch.id}`;
    const merchDescription = `Merch by ${artistName}`;

    const schema = buildArticleSchema({
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverUrl ?? avatarUrl,
      artistName: artistName,
    });

    buildOpenGraphTags($, instanceName, {
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverUrl ?? avatarUrl,
      rss,
      artistName: artistName,
      schemas: [schema],
    });
  } else {
    // Index of all merch
    buildOpenGraphTags($, instanceName, {
      title: `${artistName} merch`,
      description: `All merch by ${artistName} on ${instanceName}`,
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
  instanceName,
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
    const trackUrl = `${client.applicationUrl}/${tg.profile?.urlSlug}/release/${tg.urlSlug}/tracks/${track.id}`;
    const releaseDate = tg.releaseDate?.toISOString().split("T")[0] || "";

    const schema = buildMusicRecordingSchema({
      title: track.title ?? `A track on ${instanceName}`,
      description: `A track by ${tg.profile.name}\nReleased ${releaseDate}`,
      url: trackUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      artistName: tg.profile.name,
      artistUrl: `${client.applicationUrl}/${tg.profile?.urlSlug}`,
      releaseDate: releaseDate,
      duration: track.audio?.duration || undefined,
    });

    buildOpenGraphTags($, instanceName, {
      title: track.title ?? `A track on ${instanceName}`,
      description: `A track by ${tg.profile.name}\nReleased ${releaseDate}`,
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
      artistName: tg.profile.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  } else {
    // Album page
    const coverString = tg.cover?.url.find((u) => u.includes("x600"));
    const releaseDate = tg.releaseDate?.toISOString().split("T")[0] || "";
    const albumUrl = `${client.applicationUrl}/${tg.profile?.urlSlug}/release/${tg.urlSlug}`;

    const tracksList = tg.tracks.map((track) => ({
      title: track.title ?? "Untitled Track",
      duration: track.audio?.duration || undefined,
      url: `${albumUrl}/tracks/${track.id}`,
    }));

    let description = `An album by ${tg.profile.name}\nReleased ${releaseDate}`;

    if (tg.about) {
      description += `\n${tg.about}`;
    }

    const schema = buildMusicAlbumSchema({
      title: tg.title ?? `${instanceName} Album`,
      description: description,
      url: albumUrl,
      imageUrl: coverString
        ? generateFullStaticImageUrl(coverString, finalCoversBucket)
        : undefined,
      artistName: tg.profile.name,
      artistUrl: `${client.applicationUrl}/${tg.profile?.urlSlug}`,
      releaseDate: releaseDate,
      trackCount: tg.tracks.length,
      tracks: tracksList,
    });

    buildOpenGraphTags($, instanceName, {
      title: tg.title ?? `${instanceName} Album`,
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
      artistName: tg.profile.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  }
};

type SupportParams = { artistSlug: string; tierId?: string };
const handleSupport: RouteHandler<SupportParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { artistSlug, tierId },
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

  const artistName = artist.name ?? `A ${instanceName} Artist`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;
  const supportUrl = `${client.applicationUrl}/${artist.urlSlug}/support`;
  const supportDescription = `Support ${artistName} on ${instanceName}`;

  const tier = tierId
    ? await fetchSubscriptionTierMetadata(artistSlug, tierId)
    : null;

  if (tier) {
    const tierImage = tier.images[0]?.image;
    const imageString = tierImage?.url.find((u) => u.includes("x1200"));
    const tierUrl = `${supportUrl}/${tier.urlSlug ?? tier.id}`;
    const tierDescription = tier.description
      ? `${supportDescription}\n${tier.description}`
      : supportDescription;
    const imageUrl = imageString
      ? generateFullStaticImageUrl(imageString, finalImageBucket)
      : avatarUrl;

    const schema = buildArticleSchema({
      title: tier.name,
      description: tierDescription,
      url: tierUrl,
      imageUrl,
      artistName,
      releaseDate: tier.createdAt.toISOString().split("T")[0],
    });

    buildOpenGraphTags($, instanceName, {
      title: tier.name,
      description: tierDescription,
      url: tierUrl,
      imageUrl,
      rss,
      artistName,
      schemas: [schema],
    });
    return;
  }

  buildOpenGraphTags($, instanceName, {
    title: artistName,
    description: supportDescription,
    url: supportUrl,
    imageUrl: avatarUrl,
    rss,
  });
};

type ArtistReleasesParams = { artistSlug: string };
const handleArtistReleases: RouteHandler<ArtistReleasesParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { artistSlug },
  hydrations,
}) => {
  const artist = await fetchArtistMetadata(artistSlug);
  if (!artist) return;

  registerArtistHydration(hydrations, artist);

  const artistName = artist.name ?? `A ${instanceName} Artist`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;

  buildOpenGraphTags($, instanceName, {
    title: `${artistName} releases`,
    description: `All releases by ${artistName} on ${instanceName}`,
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
  instanceName,
  params: { pageType },
}) => {
  const title =
    pageType === "login"
      ? `Log in to ${instanceName}`
      : `Sign up to ${instanceName}`;
  buildOpenGraphTags($, instanceName, {
    title,
    description: mirloDefaultDescription,
    url: `${client.applicationUrl}/${pageType}`,
    imageUrl: `${client.applicationUrl}/${mirloDefaultImagePath}`,
  });
};

const handleDefault: RouteHandler<{}> = async ({ $, client, instanceName }) => {
  buildOpenGraphTags($, instanceName, {
    title: instanceName,
    description: mirloDefaultDescription,
    url: client.applicationUrl,
    imageUrl: `${client.applicationUrl}/${mirloDefaultImagePath}`,
  });
};

type TrackWidgetParams = { trackId: number };
const handleTrackWidget: RouteHandler<TrackWidgetParams> = async ({
  $,
  params: { trackId },
  hydrations,
}) => {
  const track = await prisma.track.findFirst({
    where: { id: trackId, trackGroup: whereForVisibleTrackGroup() },
    include: {
      trackGroup: {
        include: {
          profile: { include: { avatar: { where: { deletedAt: null } } } },
          cover: { where: { deletedAt: null } },
        },
      },
      trackArtists: true,
      audio: true,
    },
  });
  if (!track) return;

  const artist = await prisma.profile.findFirst({
    where: { id: track.trackGroup.profileId },
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
    where: { id: trackGroupId, ...whereForVisibleTrackGroup() },
    include: {
      tracks: {
        where: { deletedAt: null, audio: { uploadState: "SUCCESS" } },
        include: { audio: true, trackArtists: true, license: true },
        orderBy: { order: "asc" },
      },
      profile: {
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

  const artist = await prisma.profile.findFirst({
    where: { id: trackGroup.profileId },
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
        params: {
          artistSlug: routeParams.artistSlug,
          tierId: routeParams.tierId,
        },
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
  const segments = splitPathIntoSegments(pathname);
  const settings = await getSiteSettings();
  const instanceName = resolveInstanceName(settings);
  try {
    const client = await getClient();
    // Inject logged-in user state so the client doesn't need to wait for /auth/profile
    if (req?.user) {
      const user = await prisma.user.findFirst({
        where: { email: (req.user as { email: string }).email },
        select: userSelect,
      });
      if (user) {
        appendHydrationScript($, "__MIRLO_AUTH__", user.id, {
          user: await serializeLoggedInUser(user),
        });
      }
    }

    // Try to fetch avatar if artist exists
    let avatarUrl: string | undefined;
    const artist = await prisma.profile.findFirst({
      where: { urlSlug: segments[0], ...whereForVisibleProfile() },
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
      avatarUrl = resolveProfileImageUrl(artist);
    }

    // Match against route patterns using shared matcher
    const routeParams = matchRoutePattern(segments);
    if (routeParams) {
      await dispatchRoute(routeParams, {
        $,
        client,
        instanceName,
        avatarUrl,
        req,
      });
    } else {
      // No matching route - use default
      await handleDefault({
        $,
        client,
        instanceName,
        hydrations: [],
        params: {},
      });
    }

    const activityPubUrl = await findActivityPubAlternate(pathname);
    if (activityPubUrl) {
      $("head").append(
        `<link rel="alternate" type="application/activity+json" href="${activityPubUrl}" />`
      );
    }
  } catch (error) {
    console.error("Error in analyzePathAndGenerateHTML:", error);
    // Silently fail - don't crash page rendering
  }

  const instanceSettings = serializeInstanceSettings(
    settings,
    getAvailableLanguages()
  );
  appendHydrationScript($, "__MIRLO_INSTANCE__", "instance", instanceSettings);

  $("title").text(instanceName);
  $("title").after(`
    <style>
    html {
      --mi-instance-button-color: ${instanceSettings.colors.button};
      --mi-instance-button-text-color: ${instanceSettings.colors.buttonText};
      --mi-instance-background-color: ${instanceSettings.colors.background};
      --mi-instance-text-color: ${instanceSettings.colors.text};
      --mi-instance-show-hero-on-home: ${instanceSettings.showHeroOnHome ? "flex" : "none"};
    }
    </style>
  `);

  return $;
};

const isDev = process.env.NODE_ENV === "development";

let cachedIndexHtml: string | undefined;

const readIndexHtml = () => {
  if (cachedIndexHtml !== undefined && !isDev) {
    return cachedIndexHtml;
  }

  const fileLocation = path.join(
    __dirname,
    "..",
    "client",
    "dist",
    "index.html" // We fetch the index.html file
  );

  try {
    cachedIndexHtml = fs.readFileSync(fileLocation, "utf-8");
  } catch (e) {
    return undefined;
  }
  return cachedIndexHtml;
};

/**
 * FIXME: make this function a little more sane. Also write tests for it.
 * @param pathname
 * @returns
 */
const parseIndex = async (pathname: string, req?: Request) => {
  const indexHtml = readIndexHtml();
  if (indexHtml === undefined) {
    return "<html>No built client</html>";
  }
  const $ = cheerio.load(indexHtml);
  await analyzePathAndGenerateHTML(pathname, $, req);
  return $.html();
};

export default parseIndex;
