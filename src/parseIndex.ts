import path from "node:path";
import fs from "fs";
import * as cheerio from "cheerio";
import prisma from "@mirlo/prisma";
import { getClient } from "./activityPub/utils";
import { generateFullStaticImageUrl } from "./utils/images";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
  finalUserAvatarBucket,
} from "./utils/minio";
import { Client } from "@mirlo/prisma/client";

type Options = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  isAlbum?: boolean;
  isSong?: boolean;
  isPlayer?: string;
  rss?: string;
};

const determineType = (options: Options) => {
  if (options.isAlbum) {
    return "music.album";
  }
  if (options.isSong) {
    return "music.song";
  }
  return "article";
};

export const getTrackGroupWidget = (client: Client, trackGroupId: number) => {
  return `${client.applicationUrl}/widget/trackGroup/${trackGroupId}`;
};

export const getTrackWidget = (client: Client, trackId: number) => {
  return `${client.applicationUrl}/widget/track/${trackId}`;
};

const buildOpenGraphTags = ($: cheerio.CheerioAPI, options: Options) => {
  const { title, description, url, imageUrl, rss, isAlbum, isPlayer } = options;
  $("head").append(`
    <meta property="og:type" content="${determineType(options)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:site_name" content="${title}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:card" content="${isAlbum ? "player" : "summary"}" />

    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ""}
    ${rss ? `<link rel="alternate" type="application/rss+xml" href="${rss}" />` : ""}
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
  `);
};

const mirloDefaultDescription = "Buy and sell music directly from musicians.";

/**
 * FIXME: make this function a little more sane. Also write tests for it.
 * @param pathname
 * @returns
 */
const parseIndex = async (pathname: string) => {
  const fileLocation = path.join(
    __dirname,
    "..",
    "client",
    "dist",
    "index.html" // We fetch the index.html file
  );

  const route = pathname.split("/");
  let buffer;
  try {
    buffer = await fs.readFileSync(fileLocation);
  } catch (e) {
    return "<html>No built client</html>";
  }
  const $ = cheerio.load(buffer);

  try {
    const client = await getClient();

    if (route[1] === "releases") {
      // Recent releases
      buildOpenGraphTags($, {
        title: "Mirlo Releases",
        description: "The latest releases on Mirlo",
        url: `${client.applicationUrl}${route.join("/")}`,
        imageUrl: `${client.applicationUrl}/images/mirlo-typeface.png`,
        rss: `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`,
      });
    } else if (route[1] === "label") {
      const label = await prisma.user.findFirst({
        where: { urlSlug: route[2], isLabelAccount: true },
        include: {
          userAvatar: true,
        },
      });

      const avatarString = label?.userAvatar?.url.find((u) =>
        u.includes("x600")
      );

      buildOpenGraphTags($, {
        title: label?.name ?? "A Label on Mirlo",
        description: `A label on Mirlo`,
        url: `${client.applicationUrl}${route.join("/")}`,
        imageUrl: avatarString
          ? generateFullStaticImageUrl(avatarString, finalUserAvatarBucket)
          : undefined,
      });
    }

    const artist = await prisma.artist.findFirst({
      where: { urlSlug: route[1] },
      include: {
        avatar: true,
      },
    });

    const avatarString = artist?.avatar?.url.find((u) => u.includes("x600"));
    if (
      (route[2] === "releases" ||
        route[2] === "posts" ||
        route[2] === "merch" ||
        route[2] === "support") &&
      artist
    ) {
      const artistName = artist.name ?? "A Mirlo Artist";
      const avatarUrl = avatarString
        ? generateFullStaticImageUrl(avatarString, finalArtistAvatarBucket)
        : undefined;
      const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;
      if (route[2] === "posts") {
        const post = await prisma.post.findFirst({
          where: { id: Number(route[3]) },
          include: {
            artist: true,
            featuredImage: true,
            tracks: true,
          },
        });
        if (post) {
          const hasTracks = post.tracks.length > 0;
          // it's a post
          buildOpenGraphTags($, {
            title: post.title,
            rss,
            description: `A post by ${artistName}`,
            url: `${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}`,
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
          });
        } else {
          buildOpenGraphTags($, {
            title: artistName,
            rss,
            description: `All posts by ${artistName} on Mirlo`,
            url: `${client.applicationUrl}/${artist?.urlSlug}/posts`,
            imageUrl: avatarUrl,
          });
        }
      } else if (route[2] === "support") {
        buildOpenGraphTags($, {
          title: artistName,
          description: `Support ${artistName} on Mirlo`,
          url: `${client.applicationUrl}/${artist?.urlSlug}/releases`,
          imageUrl: avatarUrl,
          rss,
        });
      } else if (route[2] === "merch") {
        const merch = await prisma.merch.findFirst({
          where: { id: route[3] },
          include: {
            artist: true,
            images: true,
          },
        });
        if (merch) {
          const coverString = merch.images?.[0]?.url.find((u) =>
            u.includes("x600")
          );

          // it's a merch
          buildOpenGraphTags($, {
            title: merch.title,
            description: `Merch by ${artistName}`,
            url: `${client.applicationUrl}/${merch.artist?.urlSlug}/merch/${merch.id}`,
            imageUrl: coverString
              ? generateFullStaticImageUrl(coverString, finalMerchImageBucket)
              : avatarUrl,
            rss,
          });
        } else {
          buildOpenGraphTags($, {
            title: artistName,
            description: `All merch by ${artistName} on Mirlo`,
            url: `${client.applicationUrl}/${artist?.urlSlug}/merch`,
            imageUrl: avatarUrl,
            rss,
          });
        }
      }
    } else if (artist && route[2] === "release") {
      // it is about n individual release
      const tg = await prisma.trackGroup.findFirst({
        where: {
          urlSlug: route[3],
          artist: {
            urlSlug: route[1],
          },
        },
        include: {
          artist: true,
          cover: true,
        },
      });
      if (tg && route[4] === "tracks") {
        // it's a track
        const track = await prisma.track.findFirst({
          where: {
            id: Number(route[5]),
            trackGroup: {
              artist: {
                urlSlug: route[1],
              },
            },
          },
        });
        if (track) {
          const coverString = tg.cover?.url.find((u) => u.includes("x600"));
          buildOpenGraphTags($, {
            title: track.title ?? "A track on Mirlo",
            description: `A track by ${tg.artist.name}`,
            url: `${client.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}/tracks/${track.id}`,
            imageUrl: coverString
              ? generateFullStaticImageUrl(coverString, finalCoversBucket)
              : undefined,
            isSong: true,
            isPlayer: getTrackWidget(client, track.id),
          });
        }
      }

      if (tg) {
        const coverString = tg.cover?.url.find((u) => u.includes("x600"));
        buildOpenGraphTags($, {
          title: tg.title ?? "Mirlo Album",
          description: `An album by ${tg.artist.name}`,
          url: `${client.applicationUrl}/${tg.artist?.urlSlug}/releases/${tg.urlSlug}`,
          imageUrl: coverString
            ? generateFullStaticImageUrl(coverString, finalCoversBucket)
            : undefined,
          isAlbum: true,
          isPlayer: getTrackGroupWidget(client, tg.id),
        });
      }
    } else if (route[1] === "widget") {
    } else if (route[1] === "login") {
      buildOpenGraphTags($, {
        title: "Log in to Mirlo",
        description: mirloDefaultDescription,
        url: `${client.applicationUrl}/${route.join("/")}`,
      });
      // it's about a widget
    } else if (["signup"].includes(route[1])) {
      buildOpenGraphTags($, {
        title: "Sign up to Mirlo",
        description: mirloDefaultDescription,
        url: `${client.applicationUrl}/${route.join("/")}`,
      });
    } else {
      buildOpenGraphTags($, {
        title: "Mirlo",
        description: mirloDefaultDescription,
        url: `${client.applicationUrl}/${route.join("/")}`,
      });
    }
  } catch (e) {
    console.error("e", e);
  }

  return $.html();
};

export default parseIndex;
