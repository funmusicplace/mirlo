import prisma from "@mirlo/prisma";
import * as cheerio from "cheerio";

import { singleInclude, whereForVisibleProfile } from "../utils/artist";
import {
  publicFundraiserImagesInclude,
  whereForPublicFundraiser,
} from "../utils/fundraiser";
import { merchImagesInclude } from "../utils/merch";
import { postImagesForContent } from "../utils/postContent";
import { trackGroupPublishedObject } from "../utils/trackGroup";

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
      ...trackGroupPublishedObject(),
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
    where: { ...where, isDraft: false, publishedAt: { lte: new Date() } },
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
    where: { ...where, isPublic: true },
    include: { profile: true, images: merchImagesInclude },
  });
}

export async function fetchFundraiserMetadata(
  profileSlug: string,
  fundraiserSlug: string
) {
  return await prisma.fundraiser.findFirst({
    where: whereForPublicFundraiser({
      idOrSlug: fundraiserSlug,
      artistIdOrSlug: profileSlug,
    }),
    include: { profile: true, images: publicFundraiserImagesInclude },
  });
}

export const htmlToSummary = (html: string, maxLength = 200) => {
  const text = cheerio
    .load(html.replace(/<\/(p|h[1-6]|li|blockquote|div)>|<br\s*\/?>/gi, "$& "))
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : maxLength)}…`;
};
