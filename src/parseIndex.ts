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
    <meta name="twitter:title" content=${title} />
    <meta name="twitter:description" content=${description} />

    ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ""}
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
  const buffer = await fs.readFileSync(fileLocation);
  const $ = cheerio.load(buffer);

  try {
    const client = await getClient();

    const artist = await prisma.artist.findFirst({
      where: { urlSlug: route[1] },
      include: {
        avatar: true,
      },
    });

    const avatarString = artist?.avatar?.url.find((u) => u.includes("x600"));
    if (
      route[2] === "releases" ||
      route[2] === "posts" ||
      route[2] === "support"
    ) {
      if (artist) {
        const artistName = artist.name ?? "A Mirlo Artist";
        const avatarUrl = avatarString
          ? generateFullStaticImageUrl(avatarString, finalArtistAvatarBucket)
          : undefined;
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
              description: `A post by ${artistName}`,
              url: `${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}`,
              imageUrl: post.featuredImage
                ? generateFullStaticImageUrl(
                    post.featuredImage.id,
                    finalPostImageBucket,
                    post.featuredImage.extension
                  )
                : avatarUrl,
            });
          } else {
            buildOpenGraphTags($, {
              title: artistName,
              description: `All posts by ${artistName} on Mirlo`,
              url: `${client.applicationUrl}/${artist?.urlSlug}/releases`,
              imageUrl: avatarUrl,
            });
          }
        } else if (route[2] === "support") {
          buildOpenGraphTags($, {
            title: artistName,
            description: `Support ${artistName} on Mirlo`,
            url: `${client.applicationUrl}/${artist?.urlSlug}/releases`,
            imageUrl: avatarUrl,
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
