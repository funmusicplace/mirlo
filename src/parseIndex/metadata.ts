import prisma from "@mirlo/prisma";

import { singleInclude, whereForVisibleProfile } from "../utils/artist";
import { merchImagesInclude } from "../utils/merch";

export async function fetchArtistMetadata(artistSlug: string): Promise<any> {
  return await prisma.profile.findFirst({
    where: { urlSlug: artistSlug, ...whereForVisibleProfile() },
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
      adminEnabled: true,
      profile: { urlSlug: artistSlug, ...whereForVisibleProfile() },
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
      ? {
          id: postLookup.id,
          profile: { urlSlug: artistSlug, ...whereForVisibleProfile() },
        }
      : {
          urlSlug: { equals: postLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: artistSlug, ...whereForVisibleProfile() },
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

export async function fetchSubscriptionTierMetadata(
  artistSlug: string,
  tierId: string
) {
  const profile = { urlSlug: artistSlug, ...whereForVisibleProfile() };
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
  artistSlug: string,
  merchLookup: { id: string } | { slug: string }
) {
  const where =
    "id" in merchLookup
      ? {
          id: merchLookup.id,
          profile: { urlSlug: artistSlug, ...whereForVisibleProfile() },
        }
      : {
          urlSlug: { equals: merchLookup.slug, mode: "insensitive" as const },
          profile: { urlSlug: artistSlug, ...whereForVisibleProfile() },
        };

  return await prisma.merch.findFirst({
    where,
    include: { profile: true, images: merchImagesInclude },
  });
}
