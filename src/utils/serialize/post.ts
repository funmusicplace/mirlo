import { Artist, ArtistAvatar, Post } from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import { generateFullStaticImageUrl } from "../images";
import { finalArtistAvatarBucket, finalPostImageBucket } from "../minio";

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
  post: Partial<Post> & {
    artist?: (Partial<Artist> & { avatar?: ArtistAvatar | null }) | null;
  } & { featuredImage?: { extension: string; id: string } | null } & {
    tracks?: {
      trackId: number;
      track?: {
        isPreview: boolean;
        trackGroup?: {
          userTrackGroupPurchases?: { userId: number }[];
        };
        userTrackPurchases?: { userId: number }[];
      };
    }[];
  },
  isUserSubscriber?: boolean
) => ({
  ...post,
  tracks: post.tracks?.map((pt) => ({
    isPlayable:
      pt.track?.isPreview ||
      pt.track?.trackGroup?.userTrackGroupPurchases?.some(
        (purchase) => purchase.userId === pt.trackId
      ) ||
      pt.track?.userTrackPurchases?.some(
        (purchase) => purchase.userId === pt.trackId
      ) ||
      isUserSubscriber,
    ...pt,
  })),
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
  isContentHidden: !(isUserSubscriber || post.isPublic),
});
