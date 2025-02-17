import path from "node:path";
import fs from "fs";
import * as cheerio from "cheerio";
import prisma from "@mirlo/prisma";
import { getClient } from "./activityPub/utils";
import { generateFullStaticImageUrl } from "./utils/images";
import { finalPostImageBucket } from "./utils/minio";

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
    console.error("UNHANDLED FILE", pathname);
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
      <meta property="og:url" content="${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}}">
      ${
        post.featuredImageId
          ? `<meta property="og:image" content="${generateFullStaticImageUrl(post.featuredImageId, finalPostImageBucket)}" />`
          : ""
      }
    `);
      }
    } else if (route[2] === "releases") {
      // it is about releases
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
      // we should just render as normal
    }
  } catch (e) {
    console.error("e", e);
  }

  return $.html();
};

export default parseIndex;
