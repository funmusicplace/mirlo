import prisma from "@mirlo/prisma";
import {
  User,
  Prisma,
  Profile,
  ProfileSubscriptionTier,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findProfileIdForURLSlug } from "../../../../utils/artist";
import {
  canUserSeePostContent,
  getUserSubscriptionForProfile,
} from "../../../../utils/postAccess";
import { turnItemsIntoRSS } from "../../../../utils/rss";
import { serializePost } from "../../../../utils/serialize/post";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";
import { isTrackGroup } from "../../../../utils/typeguards";

export const getPostsVisibleToUser = async (
  user: User | undefined,
  profile: Profile & { subscriptionTiers: ProfileSubscriptionTier[] },
  take: number = 20,
  skip: number = 0
) => {
  const where: Prisma.PostWhereInput = {
    publishedAt: { lte: new Date() },
    profileId: Number(profile.id),
    isDraft: false,
    deletedAt: null,
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: {
        profile: { include: { avatar: { where: { deletedAt: null } } } },
        minimumSubscriptionTier: true,
        postSubscriptionTiers: true,
        featuredImage: true,
        _count: { select: { tracks: true } },
      },
      orderBy: { publishedAt: "desc" },
      take,
      skip,
    }),
    prisma.post.count({ where }),
  ]);

  const isProfileOwner = !!(user && user.id === profile.userId);
  const subscription = await getUserSubscriptionForProfile(user, profile.id);

  const processedPosts = posts.map((post) =>
    serializePost(
      post,
      undefined,
      undefined,
      canUserSeePostContent(post, { isProfileOwner, subscription })
    )
  );

  return { posts: processedPosts, total };
};

export const getAlbumsVisibleToUser = async (profile: Profile) => {
  const albums = await prisma.trackGroup.findMany({
    where: { ...whereForPublishedTrackGroups(), profileId: profile.id },
    include: { profile: { omit: { apPrivateKey: true } } },
    orderBy: {
      releaseDate: "desc",
    },
  });
  return albums;
};

export const buildFeedForProfile = async (
  user: User | undefined,
  profile: Profile & { subscriptionTiers: ProfileSubscriptionTier[] },
  take: number = 10000,
  skip: number = 0
) => {
  const { posts, total } = await getPostsVisibleToUser(
    user,
    profile,
    take,
    skip
  );
  const albums = await getAlbumsVisibleToUser(profile);

  return {
    results: [...posts, ...albums].sort((a, b) => {
      const dateA =
        (isTrackGroup(a) ? a.releaseDate : a.publishedAt) ?? new Date(0);
      const dateB =
        (isTrackGroup(b) ? b.releaseDate : b.publishedAt) ?? new Date(0);
      return dateA > dateB ? -1 : 1;
    }),
    total: total + albums.length,
  };
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
      const parsedId = await findProfileIdForURLSlug(id);
      let profile;
      if (parsedId) {
        profile = await prisma.profile.findFirst({
          where: { id: Number(parsedId) },
          include: { subscriptionTiers: true },
        });
      }

      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }

      if (format === "rss") {
        const { results: zipped } = await buildFeedForProfile(user, profile);
        const feed = await turnItemsIntoRSS(
          {
            name: profile.name,
            description: profile.bio,
            apiEndpoint: `artists/${profile.urlSlug}/feed`,
            clientUrl: profile.urlSlug,
          },
          zipped as Parameters<typeof turnItemsIntoRSS>[1]
        );
        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        const takeNum = take ? Number(take) : 20;
        const skipNum = skip ? Number(skip) : 0;

        const { results: zipped, total } = await buildFeedForProfile(
          user,
          profile,
          takeNum,
          skipNum
        );
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
