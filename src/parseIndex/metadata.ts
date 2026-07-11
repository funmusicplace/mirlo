/**
 * Shared metadata fetchers for parseIndex and oEmbed.
 * Prevents code duplication and ensures consistency across endpoints.
 */

import prisma from "@mirlo/prisma";

import { singleInclude } from "../utils/artist";

export async function fetchProfileMetadata(profileSlug: string): Promise<any> {
  return await prisma.profile.findFirst({
    where: { urlSlug: profileSlug },
    // singleInclude is deeply nested enough to hit TypeScript's recursive type
    // depth limit ("Excessive stack depth comparing types"). The `as any` cast
    // is the standard workaround — it doesn't affect runtime behaviour.
    include: singleInclude({ includeDefaultTier: true }) as any,
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
      profile: { urlSlug: profileSlug },
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
      ? { id: postLookup.id, profile: { urlSlug: profileSlug } }
      : {
          urlSlug: { equals: postLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: profileSlug },
        };

  return await prisma.post.findFirst({
    where,
    include: {
      profile: true,
      featuredImage: true,
      tracks: { orderBy: { order: "asc" } },
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
          profile: { urlSlug: profileSlug },
        }
      : {
          urlSlug: { equals: merchLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: profileSlug },
        };

  return await prisma.merch.findFirst({
    where,
    include: { profile: true, images: true },
  });
}
