/**
 * Shared metadata fetchers for parseIndex and oEmbed.
 * Prevents code duplication and ensures consistency across endpoints.
 */

import prisma from "@mirlo/prisma";

export async function fetchArtistMetadata(artistSlug: string) {
  return await prisma.artist.findFirst({
    where: { urlSlug: artistSlug },
    include: { avatar: true },
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
      artist: { urlSlug: artistSlug },
    },
    include: {
      artist: true,
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
      ? { id: postLookup.id, artist: { urlSlug: artistSlug } }
      : {
          urlSlug: { equals: postLookup.slug, mode: "insensitive" as const },
          artist: { urlSlug: artistSlug },
        };

  return await prisma.post.findFirst({
    where,
    include: {
      artist: true,
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
          artist: { urlSlug: artistSlug },
        }
      : {
          urlSlug: { equals: merchLookup.slug, mode: "insensitive" as const },
          artist: { urlSlug: artistSlug },
        };

  return await prisma.merch.findFirst({
    where,
    include: { artist: true, images: true },
  });
}
