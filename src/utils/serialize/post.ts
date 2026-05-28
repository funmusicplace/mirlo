import { Artist, ArtistAvatar, Post } from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import { generateFullStaticImageUrl } from "../images";
import { finalArtistAvatarBucket, finalPostImageBucket } from "../minio";
import { isTrackPlayable } from "../trackPlayability";

const extractFirstParagraph = (html: string): string | null => {
  const match = html.match(/<p[^>]*>[\s\S]*?<\/p>/);
  return match ? match[0] : null;
};

/**
 * Prisma include for fetching a public post with everything needed to
 * render the public Post page (cover, artist+avatar, tracks with playability).
 *
 * `userId` is the optional logged-in user id. When supplied, purchase-status
 * relations are scoped to that user so `serializePost` can compute
 * `isPlayable` without leaking other users' purchases.
 *
 * Return type is intentionally inferred (not annotated as `Prisma.PostInclude`).
 * The wide annotation forced TS to compare two heavily-generic instantiations
 * of `PostInclude` at every call site and triggered TS2321 "excessive stack
 * depth"; the inferred narrow literal still validates against `findFirst`'s
 * `include` parameter without the recursion.
 */
export const postIncludeForUser = (userId?: number) => ({
  tracks: {
    include: {
      track: {
        select: {
          isPreview: true,
          trackGroup: {
            select: {
              userTrackGroupPurchases: {
                where: { userId: userId },
                select: { userId: true },
              },
            },
          },
          userTrackPurchases: {
            where: { userId: userId },
            select: { userId: true },
          },
        },
      },
    },
    orderBy: { order: "asc" as const },
  },
  featuredImage: true,
  artist: {
    include: {
      avatar: { where: { deletedAt: null } },
    },
  },
});

export const serializePost = (
  post: Partial<Post> & { id: number; isPublic: boolean } & {
    artist?: (Partial<Artist> & { avatar?: ArtistAvatar | null }) | null;
  } & { featuredImage?: { extension: string; id: string } | null } & {
    tracks?: {
      trackId: number;
      track?: {
        title?: string | null;
        isPreview: boolean;
        trackGroupId?: number;
        audio?: { duration: number | null } | null;
      };
    }[];
  } & { _count?: { tracks?: number } },
  userTrackGroupPurchases?: Array<{ userId: number; trackGroupId: number }>,
  userTrackPurchases?: Array<{ userId: number; trackId: number }>,
  isUserSubscriber?: boolean
) => {
  const canSeeContent = !!(isUserSubscriber || post.isPublic);
  return {
    ...post,
    trackCount: post._count?.tracks ?? post.tracks?.length ?? 0,
    tracks: canSeeContent
      ? post.tracks?.map((pt) => {
          const tgPurchases = userTrackGroupPurchases ?? [];
          const trackPurchases = userTrackPurchases ?? [];

          return {
            isPlayable: isTrackPlayable({
              isPreview: pt.track?.isPreview,
              trackGroupId: pt.track?.trackGroupId,
              trackId: pt.trackId,
              trackGroupPurchases: tgPurchases,
              trackPurchases: trackPurchases,
              isUserSubscriber,
            }),
            title: pt.track?.title ?? undefined,
            audioDuration: pt.track?.audio?.duration ?? undefined,
            ...pt,
          };
        })
      : undefined,
    artist: {
      ...post.artist,
      avatar: post.artist
        ? addSizesToImage(finalArtistAvatarBucket, post.artist?.avatar)
        : null,
    },
    featuredImage: post.featuredImage && {
      ...post.featuredImage,
      src: generateFullStaticImageUrl(
        post.featuredImage.id,
        finalPostImageBucket,
        post.featuredImage.extension
      ),
    },
    isContentHidden: !canSeeContent,
    content: !canSeeContent
      ? extractFirstParagraph(post.content ?? "")
      : post.content,
  };
};
