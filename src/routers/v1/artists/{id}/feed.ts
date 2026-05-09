import prisma from "@mirlo/prisma";
import {
  User,
  Prisma,
  Artist,
  ArtistSubscriptionTier,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../utils/artist";
import {
  canUserSeePostContent,
  getUserSubscriptionForArtist,
} from "../../../../utils/postAccess";
import { turnItemsIntoRSS } from "../../../../utils/rss";
import { serializePost } from "../../../../utils/serialize/post";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";
import { isTrackGroup } from "../../../../utils/typeguards";

export const getPostsVisibleToUser = async (
  user: User | undefined,
  artist: Artist & { subscriptionTiers: ArtistSubscriptionTier[] },
  take: number = 20,
  skip: number = 0
) => {
  const where: Prisma.PostWhereInput = {
    publishedAt: { lte: new Date() },
    artistId: Number(artist.id),
    isDraft: false,
    deletedAt: null,
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: {
        artist: { include: { avatar: { where: { deletedAt: null } } } },
        minimumSubscriptionTier: true,
        postSubscriptionTiers: true,
        featuredImage: true,
      },
      orderBy: { publishedAt: "desc" },
      take,
      skip,
    }),
    prisma.post.count({ where }),
  ]);

  const isArtistOwner = !!(user && user.id === artist.userId);
  const subscription = await getUserSubscriptionForArtist(user, artist.id);

  const processedPosts = posts.map((post) =>
    serializePost(
      post,
      undefined,
      undefined,
      canUserSeePostContent(post, { isArtistOwner, subscription })
    )
  );

  return { posts: processedPosts, total };
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

export const buildFeedForArtist = async (
  user: User | undefined,
  artist: Artist & { subscriptionTiers: ArtistSubscriptionTier[] },
  take: number = 10000,
  skip: number = 0
) => {
  const { posts } = await getPostsVisibleToUser(user, artist, take, skip);
  const albums = await getAlbumsVisibleToUser(artist);

  return [...posts, ...albums].sort((a, b) => {
    const dateA =
      (isTrackGroup(a) ? a.releaseDate : a.publishedAt) ?? new Date(0);
    const dateB =
      (isTrackGroup(b) ? b.releaseDate : b.publishedAt) ?? new Date(0);
    return dateA > dateB ? -1 : 1;
  });
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    const { format, take, skip } = req.query;
    const user = req.user;

    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let artist;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: { id: Number(parsedId) },
          include: { subscriptionTiers: true },
        });
      }

      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }

      if (format === "rss") {
        const zipped = await buildFeedForArtist(user, artist);
        const feed = await turnItemsIntoRSS(
          {
            name: artist.name,
            description: artist.bio,
            apiEndpoint: `artists/${artist.urlSlug}/feed`,
            clientUrl: artist.urlSlug,
          },
          zipped as Parameters<typeof turnItemsIntoRSS>[1]
        );
        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        const takeNum = take ? Number(take) : 20;
        const skipNum = skip ? Number(skip) : 0;
        const { posts, total } = await getPostsVisibleToUser(
          user,
          artist,
          takeNum,
          skipNum
        );
        const albums = await getAlbumsVisibleToUser(artist);
        const zipped = [...posts, ...albums].sort((a, b) => {
          const dateA =
            (isTrackGroup(a) ? a.releaseDate : a.publishedAt) ?? new Date(0);
          const dateB =
            (isTrackGroup(b) ? b.releaseDate : b.publishedAt) ?? new Date(0);
          return dateA > dateB ? -1 : 1;
        });
        res.json({ results: zipped, total });
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
