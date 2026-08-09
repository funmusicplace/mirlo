import fs from "fs";
import path from "node:path";

import prisma from "@mirlo/prisma";
import { Client, User } from "@mirlo/prisma/client";
import * as cheerio from "cheerio";
import { Request } from "express";

import { findActivityPubAlternate } from "./activityPub/pageAlternate";
import {
  registerProfileHydration,
  registerPostHydration,
  registerTrackGroupHydration,
  registerTrackHydration,
  appendHydrationScript,
  HydrationData,
} from "./parseIndex/hydrations";
import {
  fetchProfileMetadata,
  fetchAlbumMetadata,
  fetchPostMetadata,
  fetchMerchMetadata,
  fetchSubscriptionTierMetadata,
} from "./parseIndex/metadata";
import {
  matchRoute as matchRoutePattern,
  type MatchedRoute,
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
import { serializeProfile } from "./serializers/artist";
import { serializeInstanceSettings } from "./serializers/instanceSettings";
import { postIncludeForUser } from "./serializers/post";
import { resolveProfileImageUrl, whereForVisibleProfile } from "./utils/artist";
import { getClient } from "./utils/getClient";
import { storedImageFileUrl, storedImageVariantUrl } from "./utils/images";
import { merchImageUrl } from "./utils/merch";
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
  profileName?: string;
  profileUrl?: string;
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
    profileName,
    schemas = [],
  } = metadata;

  // Truncate description to 160 chars for meta description (SERP snippet)
  const metaDescription =
    description.length > 160
      ? description.substring(0, 160) + "..."
      : description;

  const image = imageUrl ? imageUrl : "/" + mirloDefaultImagePath;
  const tags: [string, Record<string, string | null>][] = [
    ["link", { rel: "canonical", href: url }],
    ["meta", { property: "og:type", content: determineType(metadata) }],
    ["meta", { property: "og:title", content: title }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { name: "description", content: metaDescription }],
    ["meta", { property: "og:site_name", content: profileName || instanceName }],
    ["meta", { property: "og:url", content: url }],
    ["meta", { name: "twitter:title", content: title }],
    ["meta", { name: "twitter:description", content: description }],
    [
      "meta",
      {
        name: "twitter:card",
        content: isAlbum || twitterPlayer ? "player" : "summary",
      },
    ],
    ["meta", { property: "og:image", content: image }],
    ["meta", { name: "twitter:image", content: image }],
    ["meta", { name: "theme-color", content: metadata.color ?? null }],
    [
      "meta",
      { name: "msapplication-TileColor", content: metadata.color ?? null },
    ],
  ];
  if (rss) {
    tags.push([
      "link",
      { rel: "alternate", type: "application/rss+xml", href: rss },
    ]);
  }
  tags.push([
    "link",
    {
      rel: "alternate",
      type: "application/json+oembed",
      href: `${process.env.API_DOMAIN}/v1/oembed?url=${encodeURIComponent(url)}`,
      title: "oEmbed",
    },
  ]);
  if (ogVideo) {
    tags.push(
      ["meta", { name: "medium", content: "video" }],
      ["meta", { name: "video_height", content: `${ogVideo.height}` }],
      ["meta", { name: "video_width", content: `${ogVideo.width}` }],
      ["meta", { name: "generator", content: "Mirlo" }],
      ["meta", { property: "og:video:height", content: `${ogVideo.height}` }],
      ["meta", { property: "og:video:width", content: `${ogVideo.width}` }],
      ["meta", { property: "og:video", content: ogVideo.url }],
      ["meta", { property: "og:video:type", content: "text/html" }],
      ["meta", { property: "og:video:secure_url", content: ogVideo.url }]
    );
  }
  if (twitterPlayer) {
    tags.push(
      ["meta", { property: "twitter:player", content: twitterPlayer.url }],
      [
        "meta",
        {
          property: "twitter:player:height",
          content: `${twitterPlayer.height}`,
        },
      ],
      [
        "meta",
        { property: "twitter:player:width", content: `${twitterPlayer.width}` },
      ]
    );
  }

  const head = $("head");
  tags.forEach(([tag, attrs]) => {
    head.append($(`<${tag}>`).attr(attrs));
  });
  schemas.forEach((schema) => {
    head.append($('<script type="application/ld+json">').text(schema));
  });
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

type ProfileParams = { profileSlug: string };
const handleProfile: RouteHandler<ProfileParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { profileSlug },
  hydrations,
}) => {
  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  const profileUrl = `${client.applicationUrl}/${profile.urlSlug}`;
  const title = profile.name || `A ${instanceName} Profile`;
  const description =
    profile.bio || profile.shortDescription || `A profile on ${instanceName}`;
  const schema = buildMusicGroupSchema({
    title,
    description,
    url: profileUrl,
    imageUrl: avatarUrl,
    profileUrl: profileUrl,
  });

  registerProfileHydration(hydrations, profile);

  buildOpenGraphTags($, instanceName, {
    title,
    description,
    url: profileUrl,
    imageUrl: avatarUrl,
    profileName: profile.name,
    schemas: [schema],
  });
};

type PostParams = { profileSlug: string; postId?: number; postSlug?: string };
const handlePost: RouteHandler<PostParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  req,
  hydrations,
  params: { profileSlug, postId, postSlug },
}) => {
  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  registerProfileHydration(hydrations, profile);

  const profileName = profile.name || `A ${instanceName} Profile`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${profile.urlSlug}/feed?format=rss`;

  // Try to find specific post
  const post = postId
    ? await fetchPostMetadata(profileSlug, { id: postId })
    : postSlug
      ? await fetchPostMetadata(profileSlug, { slug: postSlug })
      : null;

  if (post) {
    const hasTracks = post.tracks.length > 0;
    const postUrl = `${client.applicationUrl}/${post.profile?.urlSlug}/posts/${post.id}`;
    const postDescription = `A post by ${profileName}`;
    const postCreatedDate = post.createdAt
      ? post.createdAt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const schema = buildArticleSchema({
      title: post.title,
      description: postDescription,
      url: postUrl,
      imageUrl: post.featuredImage
        ? storedImageFileUrl(post.featuredImage)
        : avatarUrl,
      profileName,
      releaseDate: postCreatedDate,
    });

    buildOpenGraphTags($, instanceName, {
      title: post.title,
      rss,
      description: postDescription,
      url: postUrl,
      imageUrl: post.featuredImage
        ? storedImageFileUrl(post.featuredImage)
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
      profileName,
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
      title: profileName,
      rss,
      description: `All posts by ${profileName} on ${instanceName}`,
      url: `${client.applicationUrl}/${profile?.urlSlug}/posts`,
      imageUrl: avatarUrl,
    });
  }
};

type MerchParams = { profileSlug: string; merchId?: string };
const handleMerch: RouteHandler<MerchParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { profileSlug, merchId },
  hydrations,
}) => {
  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  registerProfileHydration(hydrations, profile);

  const profileName = profile.name || `A ${instanceName} Profile`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${profile.urlSlug}/feed?format=rss`;

  // Try to find specific merch - first try as ID, then as slug
  let merch = null;
  if (merchId) {
    try {
      merch = await fetchMerchMetadata(profileSlug, { id: merchId });
    } catch {
      // ID format invalid (not a UUID), try as slug
      merch = await fetchMerchMetadata(profileSlug, { slug: merchId });
    }
  }

  if (merch) {
    const coverUrl = merchImageUrl(merch.images?.[0], 600);
    const merchUrl = `${client.applicationUrl}/${merch.profile?.urlSlug}/merch/${merch.id}`;
    const merchDescription = `Merch by ${profileName}`;

    const schema = buildArticleSchema({
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverUrl ?? avatarUrl,
      profileName,
    });

    buildOpenGraphTags($, instanceName, {
      title: merch.title,
      description: merchDescription,
      url: merchUrl,
      imageUrl: coverUrl ?? avatarUrl,
      rss,
      profileName,
      schemas: [schema],
    });
  } else {
    // Index of all merch
    buildOpenGraphTags($, instanceName, {
      title: `${profileName} merch`,
      description: `All merch by ${profileName} on ${instanceName}`,
      url: `${client.applicationUrl}/${profile?.urlSlug}/merch`,
      imageUrl: avatarUrl,
      rss,
    });
  }
};

type AlbumParams = {
  profileSlug: string;
  albumSlug?: string;
  trackId?: number;
};
const handleAlbum: RouteHandler<AlbumParams> = async ({
  $,
  client,
  instanceName,
  params: { profileSlug, albumSlug, trackId },
  hydrations,
}) => {
  if (!albumSlug) {
    // /artist/releases index - handled by artist profile
    return;
  }

  const tg = await fetchAlbumMetadata(profileSlug, albumSlug);
  if (!tg) return;

  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  registerProfileHydration(hydrations, profile);
  registerTrackGroupHydration(hydrations, tg);

  // Check if it's a specific track
  if (trackId) {
    const track = tg.tracks.find((t) => t.id === trackId);
    if (!track) return;

    registerTrackHydration(hydrations, track);

    const coverUrl = storedImageVariantUrl(tg.cover, 600);
    const trackUrl = `${client.applicationUrl}/${tg.profile?.urlSlug}/release/${tg.urlSlug}/tracks/${track.id}`;
    const releaseDate = tg.releaseDate?.toISOString().split("T")[0] || "";

    const schema = buildMusicRecordingSchema({
      title: track.title ?? `A track on ${instanceName}`,
      description: `A track by ${tg.profile.name}\nReleased ${releaseDate}`,
      url: trackUrl,
      imageUrl: coverUrl,
      profileName: tg.profile.name,
      profileUrl: `${client.applicationUrl}/${tg.profile?.urlSlug}`,
      releaseDate: releaseDate,
      duration: track.audio?.duration || undefined,
    });

    buildOpenGraphTags($, instanceName, {
      title: track.title ?? `A track on ${instanceName}`,
      description: `A track by ${tg.profile.name}\nReleased ${releaseDate}`,
      url: trackUrl,
      imageUrl: coverUrl,
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
      profileName: tg.profile.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  } else {
    // Album page
    const coverUrl = storedImageVariantUrl(tg.cover, 600);
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
      imageUrl: coverUrl,
      profileName: tg.profile.name,
      profileUrl: `${client.applicationUrl}/${tg.profile?.urlSlug}`,
      releaseDate: releaseDate,
      trackCount: tg.tracks.length,
      tracks: tracksList,
    });

    buildOpenGraphTags($, instanceName, {
      title: tg.title ?? `${instanceName} Album`,
      description: description,
      url: albumUrl,
      imageUrl: coverUrl,
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
      profileName: tg.profile.name,
      releaseDate: releaseDate,
      schemas: [schema],
    });
  }
};

type SupportParams = { profileSlug: string; tierId?: string };
const handleSupport: RouteHandler<SupportParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { profileSlug, tierId },
  hydrations,
}) => {
  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  registerProfileHydration(hydrations, profile);

  const profileName = profile.name || `A ${instanceName} Profile`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${profile.urlSlug}/feed?format=rss`;
  const supportUrl = `${client.applicationUrl}/${profile.urlSlug}/support`;
  const supportDescription = `Support ${profileName} on ${instanceName}`;

  const tier = tierId
    ? await fetchSubscriptionTierMetadata(profileSlug, tierId)
    : null;

  if (tier) {
    const tierUrl = `${supportUrl}/${tier.urlSlug ?? tier.id}`;
    const tierDescription = tier.description
      ? `${supportDescription}\n${tier.description}`
      : supportDescription;
    const imageUrl =
      storedImageVariantUrl(tier.images[0]?.image, 1200) ?? avatarUrl;

    const schema = buildArticleSchema({
      title: tier.name,
      description: tierDescription,
      url: tierUrl,
      imageUrl,
      profileName,
      releaseDate: tier.createdAt.toISOString().split("T")[0],
    });

    buildOpenGraphTags($, instanceName, {
      title: tier.name,
      description: tierDescription,
      url: tierUrl,
      imageUrl,
      rss,
      profileName,
      schemas: [schema],
    });
    return;
  }

  buildOpenGraphTags($, instanceName, {
    title: profileName,
    description: supportDescription,
    url: supportUrl,
    imageUrl: avatarUrl,
    rss,
  });
};

type ProfileReleasesParams = { profileSlug: string };
const handleProfileReleases: RouteHandler<ProfileReleasesParams> = async ({
  $,
  client,
  instanceName,
  avatarUrl,
  params: { profileSlug },
  hydrations,
}) => {
  const profile = await fetchProfileMetadata(profileSlug);
  if (!profile) return;

  registerProfileHydration(hydrations, profile);

  const profileName = profile.name || `A ${instanceName} Profile`;
  const rss = `${process.env.API_DOMAIN}/v1/artists/${profile.urlSlug}/feed?format=rss`;

  buildOpenGraphTags($, instanceName, {
    title: `${profileName} releases`,
    description: `All releases by ${profileName} on ${instanceName}`,
    url: `${client.applicationUrl}/${profile?.urlSlug}/releases`,
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
          profile: { include: { avatar: true } },
          cover: true,
        },
      },
      trackArtists: true,
      audio: true,
    },
  });
  if (!track) return;

  const profile = await prisma.profile.findFirst({
    where: { id: track.trackGroup.profileId },
    include: {
      avatar: true,
      background: true,
    },
  });

  registerTrackHydration(hydrations, track);

  if (profile) {
    registerProfileHydration(hydrations, profile);
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
          avatar: true,
        },
      },
      cover: true,
      tags: { include: { tag: true } },
      fundraiser: true,
    },
  });
  if (!trackGroup) return;

  const profile = await prisma.profile.findFirst({
    where: { id: trackGroup.profileId },
    include: {
      avatar: true,
      background: true,
    },
  });
  registerTrackGroupHydration(hydrations, trackGroup);

  if (profile) {
    appendHydrationScript($, "__MIRLO_ARTIST__", profile.id, {
      artist: serializeProfile(profile),
    });
  }
};

const dispatchRoute = async (
  routeParams: MatchedRoute,
  context: Omit<RouteContext, "params" | "hydrations">
): Promise<void> => {
  const hydrations: HydrationData[] = [];
  const contextWithHydrations = { ...context, hydrations };

  switch (routeParams.type) {
    case "releases":
      await handleReleasesPage(contextWithHydrations as RouteContext);
      break;
    case "auth":
      await handleAuthPage({
        ...contextWithHydrations,
        params: { pageType: routeParams.pageType },
      });
      break;
    case "track":
      await handleAlbum({
        ...contextWithHydrations,
        params: {
          profileSlug: routeParams.profileSlug,
          albumSlug: routeParams.albumSlug,
          trackId: routeParams.trackId,
        },
      });
      break;
    case "album":
      await handleAlbum({
        ...contextWithHydrations,
        params: {
          profileSlug: routeParams.profileSlug,
          albumSlug: routeParams.albumSlug,
        },
      });
      break;
    case "post":
      await handlePost({
        ...contextWithHydrations,
        params: {
          profileSlug: routeParams.profileSlug,
          postId: routeParams.postId,
          postSlug: routeParams.postSlug,
        },
      });
      break;
    case "posts-index":
      await handlePost({
        ...contextWithHydrations,
        params: { profileSlug: routeParams.profileSlug },
      });
      break;
    case "merch":
      await handleMerch({
        ...contextWithHydrations,
        params: {
          profileSlug: routeParams.profileSlug,
          merchId: routeParams.merchId,
        },
      });
      break;
    case "merch-index":
      await handleMerch({
        ...contextWithHydrations,
        params: { profileSlug: routeParams.profileSlug },
      });
      break;
    case "support":
      await handleSupport({
        ...contextWithHydrations,
        params: {
          profileSlug: routeParams.profileSlug,
          tierId: routeParams.tierId,
        },
      });
      break;
    case "profile-releases":
      await handleProfileReleases({
        ...contextWithHydrations,
        params: { profileSlug: routeParams.profileSlug },
      });
      break;
    case "profile":
      await handleProfile({
        ...contextWithHydrations,
        params: { profileSlug: routeParams.profileSlug },
      });
      break;
    case "widget-track":
      await handleTrackWidget({
        ...contextWithHydrations,
        params: { trackId: routeParams.trackId },
      });
      break;
    case "widget-trackgroup":
      await handleTrackGroupWidget({
        ...contextWithHydrations,
        params: { trackGroupId: routeParams.trackGroupId },
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
    const profile = await prisma.profile.findFirst({
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
    if (profile) {
      avatarUrl = resolveProfileImageUrl(profile);
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
        $("<link>").attr({
          rel: "alternate",
          type: "application/activity+json",
          href: activityPubUrl,
        })
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
