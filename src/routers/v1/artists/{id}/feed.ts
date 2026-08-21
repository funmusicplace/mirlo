import prisma from "@mirlo/prisma";
import {
  User,
  Prisma,
  Profile,
  ProfileSubscriptionTier,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializePost } from "../../../../serializers/post";
import { processSingleTrackGroup } from "../../../../serializers/trackGroup";
import { findProfileIdForURLSlug } from "../../../../utils/artist";
import {
  canUserSeePostContent,
  getUserSubscriptionForProfile,
} from "../../../../utils/postAccess";
import { turnItemsIntoRSS } from "../../../../utils/rss";
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

const MAX_ALBUMS_IN_FEED = 100;

export const getAlbumsVisibleToUser = async (profile: Profile) => {
  const albums = await prisma.trackGroup.findMany({
    where: { ...whereForPublishedTrackGroups(), profileId: profile.id },
    include: { profile: { omit: { apPrivateKey: true } } },
    orderBy: {
      releaseDate: "desc",
    },
    take: MAX_ALBUMS_IN_FEED,
  });
  return albums.map((album) => processSingleTrackGroup(album));
};

export const getAlbumsCountForProfile = async (profile: Profile) => {
  return prisma.trackGroup.count({
    where: { ...whereForPublishedTrackGroups(), profileId: profile.id },
  });
};

const MAX_FEED_TAKE = 50;

export const buildFeedForProfile = async (
  user: User | undefined,
  profile: Profile & { subscriptionTiers: ProfileSubscriptionTier[] },
  take: number = MAX_FEED_TAKE,
  skip: number = 0
) => {
  const clampedTake = Math.min(
    Math.max(Number.isFinite(take) ? take : MAX_FEED_TAKE, 1),
    MAX_FEED_TAKE
  );
  const clampedSkip = Math.max(Number.isFinite(skip) ? skip : 0, 0);

  const { posts, total: totalPosts } = await getPostsVisibleToUser(
    user,
    profile,
    clampedTake,
    clampedSkip
  );
  const albums = await getAlbumsVisibleToUser(profile);
  const totalAlbums = await getAlbumsCountForProfile(profile);

  return {
    results: [...posts, ...albums].sort((a, b) => {
      const dateA =
        (isTrackGroup(a) ? a.releaseDate : a.publishedAt) ?? new Date(0);
      const dateB =
        (isTrackGroup(b) ? b.releaseDate : b.publishedAt) ?? new Date(0);
      return dateA > dateB ? -1 : 1;
    }),
    total: totalPosts + totalAlbums,
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
          zipped as unknown as Parameters<typeof turnItemsIntoRSS>[1]
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

/** @deprecated alias while ActivityPub migrates */
export const buildFeedForArtist = buildFeedForProfile;
