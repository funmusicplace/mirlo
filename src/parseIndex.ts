import path from "node:path";
import fs from "fs";
import * as cheerio from "cheerio";
import prisma from "@mirlo/prisma";
import { getClient } from "./activityPub/utils";
import { generateFullStaticImageUrl } from "./utils/images";
import { finalCoversBucket, finalPostImageBucket } from "./utils/minio";

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
        $("head").append(`
      <meta property="og:type" content="article">
      <meta property="og:title" content="${post.title}">
      <meta property="og:description" content="An post by ${post.artist?.name ?? "A Mirlo artist"} on Mirlo">
      <meta property="og:url" content="${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}}">
      ${
        post.featuredImage
          ? `<meta property="og:image" content="${generateFullStaticImageUrl(post.featuredImage.id, finalPostImageBucket, post.featuredImage.extension)}" />`
          : ""
      }
    `);
      }
    } else if (route[2] === "release") {
      // it is about n individual release
      console.log("release-route", route);
      const tg = await prisma.trackGroup.findFirst({
        where: { urlSlug: route[3] },
        include: {
          artist: true,
          cover: true,
        },
      });
      if (tg) {
        console.log("rfound release");
        $("head").append(`
        <meta property="og:type" content="article">
        <meta property="og:title" content="${tg.title}">
        <meta property="og:description" content="An album by ${tg.artist.name} on Mirlo">
        <meta property="og:url" content="${client.applicationUrl}/${tg.artist?.urlSlug}/releases/${tg.urlSlug}">
        ${
          tg.cover
            ? `<meta property="og:image" content="${generateFullStaticImageUrl(tg.cover.url[600], finalCoversBucket)}" />`
            : ""
        }
      `);
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
    }
  } catch (e) {
    console.error("e", e);
  }

  return $.html();
};

export default parseIndex;
