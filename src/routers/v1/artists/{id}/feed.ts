import prisma from "@mirlo/prisma";
import {
  User,
  Prisma,
  Profile,
  ProfileSubscriptionTier,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { compact, keyBy, orderBy } from "lodash";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializePost } from "../../../../serializers/post";
import { processSingleTrackGroup } from "../../../../serializers/trackGroup";
import {
  canUserEditProfile,
  findProfileIdForURLSlug,
  resolveProfileImageUrl,
  whereForVisibleProfile,
} from "../../../../utils/artist";
import {
  canUserSeePostContent,
  getUserSubscriptionsForProfile,
} from "../../../../utils/postAccess";
import { postImagesForContent } from "../../../../utils/postContent";
import { turnItemsIntoRSS } from "../../../../utils/rss";
import { getInstanceName } from "../../../../utils/settings";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

const wherePublishedPostsForProfile = (
  profileId: number
): Prisma.PostWhereInput => ({
  publishedAt: { lte: new Date() },
  profileId,
  isDraft: false,
  deletedAt: null,
});

const wherePublishedAlbumsForProfile = (
  profileId: number
): Prisma.TrackGroupWhereInput => ({
  ...whereForPublishedTrackGroups(),
  profileId,
});

const postFeedOrder = [
  { publishedAt: "desc" },
  { id: "desc" },
] satisfies Prisma.PostOrderByWithRelationInput[];

const albumFeedOrder = [
  { releaseDate: { sort: "desc", nulls: "last" } },
  { id: "desc" },
] satisfies Prisma.TrackGroupOrderByWithRelationInput[];

export const getPostsVisibleToUser = async (
  user: User | undefined,
  profile: Profile & { subscriptionTiers: ProfileSubscriptionTier[] },
  take: number = 20,
  skip: number = 0
) => {
  const where = wherePublishedPostsForProfile(profile.id);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        profile: { include: { avatar: true } },
        minimumSubscriptionTier: true,
        postSubscriptionTiers: true,
        featuredImage: true,
        images: postImagesForContent,
        _count: { select: { tracks: true } },
      },
      orderBy: postFeedOrder,
      take,
      skip,
    }),
    prisma.post.count({ where }),
  ]);

  const isProfileOwner = await canUserEditProfile(profile.id, user);
  const subscriptions = await getUserSubscriptionsForProfile(user, profile.id);

  const processedPosts = posts.map((post) =>
    serializePost(
      post,
      undefined,
      undefined,
      canUserSeePostContent(post, { isProfileOwner, subscriptions })
    )
  );

  return { posts: processedPosts, total };
};

export const getAlbumsVisibleToUser = async (
  profile: Profile,
  take: number,
  skip: number
) => {
  const albums = await prisma.trackGroup.findMany({
    where: wherePublishedAlbumsForProfile(profile.id),
    include: {
      profile: { omit: { apPrivateKey: true } },
      tags: { include: { tag: true } },
    },
    orderBy: albumFeedOrder,
    take,
    skip,
  });
  return albums.map((album) => processSingleTrackGroup(album));
};

export const getAlbumsCountForProfile = async (profile: Profile) => {
  return prisma.trackGroup.count({
    where: wherePublishedAlbumsForProfile(profile.id),
  });
};

export const getFeedCountForProfile = async (profile: Profile) => {
  const [posts, albums] = await Promise.all([
    prisma.post.count({ where: wherePublishedPostsForProfile(profile.id) }),
    getAlbumsCountForProfile(profile),
  ]);
  return posts + albums;
};

export const getFeedPageForProfile = async (
  user: User | undefined,
  profile: Profile & { subscriptionTiers: ProfileSubscriptionTier[] },
  take: number,
  skip: number
) => {
  const [postKeys, albumKeys] = await Promise.all([
    prisma.post.findMany({
      where: wherePublishedPostsForProfile(profile.id),
      select: { id: true, publishedAt: true },
      orderBy: postFeedOrder,
      take: skip + take + 1,
    }),
    prisma.trackGroup.findMany({
      where: wherePublishedAlbumsForProfile(profile.id),
      select: { id: true, releaseDate: true },
      orderBy: albumFeedOrder,
      take: skip + take + 1,
    }),
  ]);

  const keys = orderBy(
    [
      ...postKeys.map((p) => ({
        type: "post",
        id: p.id,
        date: p.publishedAt,
      })),
      ...albumKeys.map((a) => ({
        type: "album",
        id: a.id,
        date: a.releaseDate ?? new Date(0),
      })),
    ],
    [(k) => k.date.getTime(), "type", "id"],
    ["desc", "desc", "desc"]
  );
  const before = keys.slice(0, skip);
  const page = keys.slice(skip, skip + take);
  const countOf = (list: typeof keys, type: string) =>
    list.filter((k) => k.type === type).length;

  const postTake = countOf(page, "post");
  const albumTake = countOf(page, "album");
  const [{ posts }, albums] = await Promise.all([
    postTake > 0
      ? getPostsVisibleToUser(user, profile, postTake, countOf(before, "post"))
      : { posts: [] },
    albumTake > 0
      ? getAlbumsVisibleToUser(profile, albumTake, countOf(before, "album"))
      : [],
  ]);

  const postsById = keyBy(posts, "id");
  const albumsById = keyBy(albums, "id");
  return {
    results: compact(
      page.map((k) => (k.type === "post" ? postsById[k.id] : albumsById[k.id]))
    ),
    hasMore: keys.length > skip + take,
  };
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

  const [{ results }, total] = await Promise.all([
    getFeedPageForProfile(user, profile, clampedTake, clampedSkip),
    getFeedCountForProfile(profile),
  ]);

  return { results, total };
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
          where: {
            id: Number(parsedId),
            ...(user?.isAdmin ? {} : whereForVisibleProfile()),
          },
          include: {
            subscriptionTiers: true,
            avatar: true,
            background: true,
            trackGroups: {
              where: whereForPublishedTrackGroups(),
              include: { cover: true },
              take: 1,
              orderBy: { orderIndex: "asc" },
            },
          },
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
            imageUrl: resolveProfileImageUrl(profile),
            instanceName: await getInstanceName(),
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
