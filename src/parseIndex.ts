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
import { isNumber } from "lodash";
import { getSiteSettings } from "./utils/settings";

type Options = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  isAlbum?: boolean;
  isSong?: boolean;
  isPlayer?: string;
  rss?: string;
  color?: string;
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
  const {
    title,
    description,
    url,
    imageUrl,
    rss,
    isAlbum,
    isPlayer,
    color = "#be3455",
  } = options;
  $("head").append(`
    <meta property="og:type" content="${determineType(options)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:site_name" content="${title}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:card" content="${isAlbum ? "player" : "summary"}" />

    <meta property="og:image" content="${imageUrl ? imageUrl : "/android-chrome-512x512.png"}" />
    <meta name="twitter:image" content="${imageUrl ? imageUrl : "/android-chrome-512x512.png"}" />
    <meta name="theme-color" content="${options.color}" />
    <meta name="msapplication-TileColor" content="${options.color}" />

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

export const analyzePathAndGenerateHTML = async (
  pathname: string,
  $: cheerio.CheerioAPI
) => {
  const route = pathname.split("/");

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
    }

    const artist = await prisma.artist.findFirst({
      where: { urlSlug: route[1] },
      include: {
        avatar: true,
      },
    });
    const avatarString = artist?.avatar?.url.find((u) => u.includes("x600"));
    const avatarUrl = avatarString
      ? generateFullStaticImageUrl(avatarString, finalArtistAvatarBucket)
      : undefined;
    if (artist && route.length === 2) {
      buildOpenGraphTags($, {
        title: artist.name ?? "A Mirlo Artist",
        description: artist.bio ?? "An artist on Mirlo",
        url: `${client.applicationUrl}${route.join("/")}`,
        imageUrl: avatarUrl,
      });
    } else if (
      (route[2] === "releases" ||
        route[2] === "posts" ||
        route[2] === "merch" ||
        route[2] === "support") &&
      artist
    ) {
      const artistName = artist.name ?? "A Mirlo Artist";

      const rss = `${process.env.API_DOMAIN}/v1/artists/${artist.urlSlug}/feed?format=rss`;
      if (route[2] === "posts") {
        let post;
        if (isNumber(route[3])) {
          post = await prisma.post.findFirst({
            where: { id: Number(route[3]) },
            include: {
              artist: true,
              featuredImage: true,
              tracks: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          });
        } else if (route[3]) {
          post = await prisma.post.findFirst({
            where: { urlSlug: { equals: route[3], mode: "insensitive" } },
            include: {
              artist: true,
              featuredImage: true,
              tracks: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          });
        }

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
        let merch;
        if (route[3] && isNumber(route[3])) {
          merch = await prisma.merch.findFirst({
            where: { id: route[3] },
            include: {
              artist: true,
              images: true,
            },
          });
        } else if (route[3]) {
          // it is about a merch item
          merch = await prisma.merch.findFirst({
            where: { urlSlug: { equals: route[3], mode: "insensitive" } },
            include: {
              artist: true,
              images: true,
            },
          });
        }

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
            title: `${artistName} merch`,
            description: `All merch by ${artistName} on Mirlo`,
            url: `${client.applicationUrl}/${artist?.urlSlug}/merch`,
            imageUrl: avatarUrl,
            rss,
          });
        }
      } else {
        // it's about the artist in general
        buildOpenGraphTags($, {
          title: `${artistName} ${route[2]}`,
          description: `All ${route[2]} by ${artistName} on Mirlo`,
          url: `${client.applicationUrl}/${artist?.urlSlug}/${route[2]}`,
          imageUrl: avatarUrl,
          rss,
        });
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
          tracks: true,
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
            description: `A track by ${tg.artist.name}\nReleased ${tg.releaseDate?.toISOString().split("T")[0]}`,
            url: `${client.applicationUrl}/${tg.artist?.urlSlug}/release/${tg.urlSlug}/tracks/${track.id}`,
            imageUrl: coverString
              ? generateFullStaticImageUrl(coverString, finalCoversBucket)
              : undefined,
            isSong: true,
            isPlayer: getTrackWidget(client, track.id),
          });
        }
      } else if (tg) {
        const coverString = tg.cover?.url.find((u) => u.includes("x600"));
        //render a text tracklist to display in the description
        const tracklist = "";
        for (const [index, value] of tg.tracks.entries()) {
          const trackListItem = `${index + 1}. ${value.title} by ${tg.artist}`;
          tracklist.concat("\n", trackListItem);
        }
        buildOpenGraphTags($, {
          title: tg.title ?? "Mirlo Album",
          //Add artist, trackist, and blurb to description. I'm guessing that the blurb that appear's on an album's page is from tg.about but I don't actually know.
          description: `An album by ${tg.artist.name}\nReleased ${tg.releaseDate?.toISOString().split("T")[0]}\n${tracklist}\n${tg.about}`,
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

  const settings = await getSiteSettings();

  $("title").after(`
    <style>
    html {
      --mi-instance-primary-color: ${settings.settings?.instanceCustomization?.colors?.primary ?? "#be3455"};
      --mi-instance-secondary-color: ${settings.settings?.instanceCustomization?.colors?.secondary ?? "#ffffff"};
      --mi-instance-background-color: ${settings.settings?.instanceCustomization?.colors?.background ?? "#ffffff"};
      --mi-instance-foreground-color: ${settings.settings?.instanceCustomization?.colors?.foreground ?? "#000000"};
      --mi-instance-show-hero-on-home: ${settings.settings?.instanceCustomization?.showHeroOnHome ? "block" : "none"};
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
const parseIndex = async (pathname: string) => {
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
  await analyzePathAndGenerateHTML(pathname, $);
  return $.html();
};

export default parseIndex;
