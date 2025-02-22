import path from "node:path";
import fs from "fs";
import * as cheerio from "cheerio";
import prisma from "@mirlo/prisma";
import { getClient } from "./activityPub/utils";
import { generateFullStaticImageUrl } from "./utils/images";
import {
  finalArtistAvatarBucket,
  finalCoversBucket,
  finalPostImageBucket,
} from "./utils/minio";

const buildOpenGraphTags = (
  $: cheerio.CheerioAPI,
  {
    title,
    description,
    url,
    imageUrl,
  }: { title: string; description: string; url: string; imageUrl?: string }
) => {
  $("head").append(`
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ""}
  `);
};

const parseIndex = async (pathname: string) => {
  const fileLocation = path.join(
    __dirname,
    "..",
    "client",
    "dist",
    "index.html" // We fetch the index.html file
  );

  const route = pathname.split("/");
  const buffer = await fs.readFileSync(fileLocation);
  const $ = cheerio.load(buffer);

  try {
    const client = await getClient();
    if (route[2] === "posts") {
      const post = await prisma.post.findFirst({
        where: { id: Number(route[3]) },
        include: {
          artist: true,
          featuredImage: true,
        },
      });
      if (post) {
        // it's a post
        buildOpenGraphTags($, {
          title: post.title,
          description: `A post by ${post.artist?.name ?? "a Mirlo artist"}`,
          url: `${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}`,
          imageUrl: post.featuredImage
            ? generateFullStaticImageUrl(
                post.featuredImage.id,
                finalPostImageBucket,
                post.featuredImage.extension
              )
            : undefined,
        });
      }
    } else if (route[2] === "release") {
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
      if (tg) {
        const coverString = tg.cover?.url.find((u) => u.includes("x600"));
        buildOpenGraphTags($, {
          title: tg.title ?? "Mirlo Album",
          description: `An album by ${tg.artist.name}`,
          url: `${client.applicationUrl}/${tg.artist?.urlSlug}/releases/${tg.urlSlug}`,
          imageUrl: coverString
            ? generateFullStaticImageUrl(coverString, finalCoversBucket)
            : undefined,
        });
      }
    } else if (route[2] === "releases") {
      // it is about n individual release
      const artist = await prisma.artist.findFirst({
        where: { urlSlug: route[1] },
        include: {
          avatar: true,
        },
      });
      if (artist) {
        const coverString = artist.avatar?.url.find((u) => u.includes("x600"));
        buildOpenGraphTags($, {
          title: artist.name ?? "A Mirlo Artist",
          description: `An artist on Mirlo`,
          url: `${client.applicationUrl}/${artist?.urlSlug}/releases`,
          imageUrl: coverString
            ? generateFullStaticImageUrl(coverString, finalCoversBucket)
            : undefined,
        });
      }
    } else if (route[1] === "widget") {
      // it's about a widget
    } else if (
      [
        "admin",
        "pages",
        "profile",
        "password-reset",
        "login",
        "signup",
        "manage",
      ].includes(route[1])
    ) {
      // we write our own little custom texts to render these pages
    } else {
      console.log("unahndled", route);
    }
  } catch (e) {
    console.error("e", e);
  }

  return $.html();
};

export default parseIndex;
