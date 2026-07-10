/**
 * Shared metadata fetchers for parseIndex and oEmbed.
 * Prevents code duplication and ensures consistency across endpoints.
 */

import prisma from "@mirlo/prisma";

import { singleInclude } from "../utils/artist";

export async function fetchArtistMetadata(artistSlug: string): Promise<any> {
  return await prisma.profile.findFirst({
    where: { urlSlug: artistSlug },
    // singleInclude is deeply nested enough to hit TypeScript's recursive type
    // depth limit ("Excessive stack depth comparing types"). The `as any` cast
    // is the standard workaround — it doesn't affect runtime behaviour.
    include: singleInclude({ includeDefaultTier: true }) as any,
  });
}

export async function fetchAlbumMetadata(
  artistSlug: string,
  albumSlug: string
) {
  return await prisma.trackGroup.findFirst({
    where: {
      urlSlug: albumSlug,
      deletedAt: null,
      profile: { urlSlug: artistSlug },
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
  artistSlug: string,
  albumSlug: string,
  trackId: number
) {
  const album = await fetchAlbumMetadata(artistSlug, albumSlug);
  if (!album) return null;

  return album.tracks.find((t) => t.id === trackId);
}

export async function fetchPostMetadata(
  artistSlug: string,
  postLookup: { id: number } | { slug: string }
) {
  const where =
    "id" in postLookup
      ? { id: postLookup.id, profile: { urlSlug: artistSlug } }
      : {
          urlSlug: { equals: postLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: artistSlug },
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
  artistSlug: string,
  merchLookup: { id: string } | { slug: string }
) {
  const where =
    "id" in merchLookup
      ? {
          id: merchLookup.id,
          profile: { urlSlug: artistSlug },
        }
      : {
          urlSlug: { equals: merchLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: artistSlug },
        };

  return await prisma.merch.findFirst({
    where,
    include: { profile: true, images: true },
  });
}
