import { Request, Response } from "express";
import {
  User,
  Prisma,
  TrackGroup,
  Post,
  Artist,
  ArtistSubscriptionTier,
} from "@mirlo/prisma/client";

import RSS from "rss";

import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../utils/artist";
import { markdownAsHtml } from "../../../../utils/post";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";
import { isTrackGroup } from "../../../../utils/typeguards";
import {
  headersAreForActivityPub,
  turnFeedIntoOutbox,
} from "../../../../activityPub/utils";
import { generateFullStaticImageUrl } from "../../../../utils/images";
import { finalPostImageBucket } from "../../../../utils/minio";

export const getPostsVisibleToUser = async (
  user: User,
  artist: Artist & { subscriptionTiers: ArtistSubscriptionTier[] },
  take: number = 20,
  skip: number = 0
) => {
  let where: Prisma.PostWhereInput = {
    publishedAt: { lte: new Date() },
    artistId: Number(artist.id),
    isPublic: true,
    isDraft: false,
  };

  if (user) {
    delete where.isPublic;
    // FIXME: is there a way to craft the where statement so that
    // we don't have to post process this?
  }

  const itemCount = await prisma.post.count({
    where,
  });

  let posts = await prisma.post.findMany({
    where,
    include: {
      artist: true,
      minimumSubscriptionTier: true,
      postSubscriptionTiers: true,
      featuredImage: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  if (user) {
    const userSubscription = await prisma.artistUserSubscription.findFirst({
      where: {
        userId: user.id,
        artistSubscriptionTierId: {
          in: artist.subscriptionTiers.map((s) => s.id),
        },
      },
      orderBy: {
        amount: "asc",
      },
    });
    if (userSubscription) {
      // Filter posts
      // If the post minimum tier matches the user's subscription :ok:
      // If any of the post's tiers match the user's subscription :ok:
      posts = posts.filter(
        (p) =>
          (p.minimumSubscriptionTier?.minAmount ?? 0) <=
            userSubscription.amount ||
          p.postSubscriptionTiers.find(
            (t) =>
              userSubscription.artistSubscriptionTierId ===
              t.artistSubscriptionTierId
          ) ||
          p.isPublic
      );
    } else {
      posts = posts.filter((p) => p.isPublic);
    }
  }

  // This isn't very efficient for large number of posts
  const takePosts = posts.slice(skip, take + skip);

  return {
    posts: takePosts.map((post) => ({
      ...post,
      featuredImage: post.featuredImage && {
        ...post.featuredImage,
        src: generateFullStaticImageUrl(
          post.featuredImage.id,
          finalPostImageBucket,
          post.featuredImage.extension
        ),
      },
    })),
    total: posts.length,
  };
};

export const getAlbumsVisibleToUser = async (artist: Artist) => {
  const albums = await prisma.trackGroup.findMany({
    where: { ...whereForPublishedTrackGroups(), artistId: artist.id },
    include: { artist: true },
    orderBy: {
      releaseDate: "desc",
    },
  });
  return albums;
};

export const turnItemsIntoRSS = async (
  artist: { name: string; bio?: string | null; urlSlug: string },
  zipped: (
    | (TrackGroup & { artist: { name: string; urlSlug: string; id: number } })
    | Post
  )[]
) => {
  // TODO: probably want to convert this to some sort of module
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const feed = new RSS({
    title: `${artist.name} Feed`,
    description: artist.bio ?? undefined,
    feed_url: `${process.env.API_DOMAIN}/v1/${artist.urlSlug}/feed?format=rss`,
    site_url: `${client?.applicationUrl}/${artist.urlSlug}`,
  });

  for (const p of zipped) {
    feed.item({
      title: p.title ?? "",
      description: isTrackGroup(p)
        ? `<h2>An album release by artist ${p.artist.name}.</h2>`
        : markdownAsHtml(p.content),
      url: isTrackGroup(p)
        ? `${client?.applicationUrl}/${p.artist.urlSlug}/release/${p.urlSlug}`
        : `${client?.applicationUrl}/post/${p.id}`,
      date: isTrackGroup(p) ? p.releaseDate : p.publishedAt,
    });
  }
  return feed;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    const { format } = req.query;
    const user = req.user as User;

    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let artist;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: {
            id: Number(parsedId),
          },
          include: {
            subscriptionTiers: true,
          },
        });
      }

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }

      const posts = await getPostsVisibleToUser(user, artist);

      const albums = await getAlbumsVisibleToUser(artist);

      const zipped = [...posts.posts, ...albums].sort((a, b) => {
        const publishedDateA = isTrackGroup(a) ? a.releaseDate : a.publishedAt;
        const publishedDateB = isTrackGroup(b) ? b.releaseDate : b.publishedAt;
        if (publishedDateA > publishedDateB) {
          return -1;
        } else {
          return 1;
        }
      });

      if (headersAreForActivityPub(req.headers, "accept")) {
        if (req.headers.accept) {
          res.set("content-type", "application/activity+json");
        }
        const feed = await turnFeedIntoOutbox(artist, zipped);

        res.send(feed);
      } else if (format === "rss") {
        const feed = await turnItemsIntoRSS(artist, zipped);
        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        res.json({
          results: zipped,
        });
      }
    } catch (e) {
      console.error(`/v1/artists/{id}/feed ${e}`);
      res.status(400);
    }
  }

  GET.apiDoc = {
    summary: "Returns all published posts",
    responses: {
      200: {
        description: "A list of published posts",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
          },
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
