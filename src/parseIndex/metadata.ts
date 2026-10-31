import prisma from "@mirlo/prisma";

import { singleInclude, whereForVisibleProfile } from "../utils/artist";
import { merchImagesInclude } from "../utils/merch";
import { postImagesForContent } from "../utils/postContent";

export async function fetchProfileMetadata(profileSlug: string): Promise<any> {
  const include = singleInclude({ includeDefaultTier: true });
  return await prisma.profile.findFirst({
    where: { urlSlug: profileSlug, ...whereForVisibleProfile() },
    include: {
      ...include,
      posts: {
        where: (include.posts as { where: object }).where,
        take: 1,
        select: { id: true, isPublic: true },
      },
    } as any,
  });
}

export async function fetchAlbumMetadata(
  profileSlug: string,
  albumSlug: string
) {
  return await prisma.trackGroup.findFirst({
    where: {
      urlSlug: albumSlug,
      deletedAt: null,
      adminEnabled: true,
      profile: { urlSlug: profileSlug, ...whereForVisibleProfile() },
    },
    include: {
      profile: true,
      cover: true,
      tracks: {
        where: { deletedAt: null },
        include: { audio: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function fetchTrackMetadata(
  profileSlug: string,
  albumSlug: string,
  trackId: number
) {
  const album = await fetchAlbumMetadata(profileSlug, albumSlug);
  if (!album) return null;

  return album.tracks.find((t) => t.id === trackId);
}

export async function fetchPostMetadata(
  profileSlug: string,
  postLookup: { id: number } | { slug: string }
) {
  const where =
    "id" in postLookup
      ? {
          id: postLookup.id,
          profile: { urlSlug: profileSlug, ...whereForVisibleProfile() },
        }
      : {
          urlSlug: { equals: postLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: profileSlug, ...whereForVisibleProfile() },
        };

  return await prisma.post.findFirst({
    where,
    include: {
      profile: true,
      featuredImage: true,
      images: postImagesForContent,
      tracks: { orderBy: { order: "asc" } },
    },
  });
}

export async function fetchSubscriptionTierMetadata(
  profileSlug: string,
  tierId: string
) {
  const profile = { urlSlug: profileSlug, ...whereForVisibleProfile() };
  const numericId = Number(tierId);

  return await prisma.profileSubscriptionTier.findFirst({
    where: {
      deletedAt: null,
      isDefaultTier: false,
      profile,
      OR: [
        { urlSlug: { equals: tierId, mode: "insensitive" as const } },
        ...(Number.isInteger(numericId) ? [{ id: numericId }] : []),
      ],
    },
    include: {
      images: {
        where: { image: { deletedAt: null } },
        include: { image: true },
      },
    },
  });
}

export async function fetchMerchMetadata(
  profileSlug: string,
  merchLookup: { id: string } | { slug: string }
) {
  const where =
    "id" in merchLookup
      ? {
          id: merchLookup.id,
          profile: { urlSlug: profileSlug, ...whereForVisibleProfile() },
        }
      : {
          urlSlug: { equals: merchLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: profileSlug, ...whereForVisibleProfile() },
        };

  return await prisma.merch.findFirst({
    where,
    include: { profile: true, images: merchImagesInclude },
  });
}
