import { Image, Prisma, Profile, Post } from "@mirlo/prisma/client";

import { addSizesToStoredImage } from "../utils/artist";
import { storedImageFileUrl } from "../utils/images";
import {
  ContentImage,
  postImagesForContent,
  resolvePostContent,
} from "../utils/postContent";
import { whereForVisibleTrackGroup } from "../utils/trackGroup";
import { isTrackPlayable } from "../utils/trackPlayability";

import {
  omitApPrivateKey,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";

const extractFirstParagraph = (html: string): string | null => {
  const match = html.match(/<p[^>]*>[\s\S]*?<\/p>/);
  return match ? match[0] : null;
};

export const whereForVisiblePostTrack = (): Prisma.PostTrackWhereInput => ({
  track: {
    deletedAt: null,
    trackGroup: whereForVisibleTrackGroup(),
  },
});

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
    where: whereForVisiblePostTrack(),
    include: {
      track: {
        select: {
          title: true,
          isPreview: true,
          trackGroupId: true,
          audio: { select: { duration: true } },
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
  images: postImagesForContent,
  minimumSubscriptionTier: true,
  postSubscriptionTiers: true,
  profile: {
    include: {
      avatar: true,
    },
  },
});

type PostInput = Partial<Post> & {
  id: number;
  isPublic: boolean;
  profileId?: number | null;
  profile?: (Partial<Profile> & { avatar?: Image | null }) | null;
} & {
  featuredImage?: {
    id: string;
    url: string[];
    keyPrefix: string | null;
  } | null;
} & {
  images: ContentImage[];
} & {
  tracks?: {
    trackId: number;
    track?: {
      title?: string | null;
      isPreview: boolean;
      trackGroupId?: number;
      audio?: { duration: number | null } | null;
    };
  }[];
} & { _count?: { tracks?: number } };

export const serializePost = <T extends PostInput>(
  post: T,
  userTrackGroupPurchases?: Array<{ userId: number; trackGroupId: number }>,
  userTrackPurchases?: Array<{ userId: number; trackId: number }>,
  /**
   * Prefer getCanUserSeePostContent / canUserSeePostContent from postAccess.
   * Still ORs `post.isPublic` so list endpoints can pass subscriber/owner only.
   */
  canSeeContent?: boolean
): Serialized<T> & {
  trackCount: number;
  isContentHidden: boolean;
} => {
  const contentVisible = !!(canSeeContent || post.isPublic);
  const { profile, profileId, images: _images, ...postRest } = post;
  const content = resolvePostContent(post);

  return {
    ...postRest,
    artistId: profileId ?? undefined,
    artist: profile
      ? {
          ...omitApPrivateKey(profile),
          avatar: renameProfileIdToArtistId(
            addSizesToStoredImage(profile.avatar)
          ),
        }
      : undefined,
    trackCount: post._count?.tracks ?? post.tracks?.length ?? 0,
    tracks: contentVisible
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
              // Same flag the API historically passed through for playability.
              isUserSubscriber: canSeeContent,
            }),
            title: pt.track?.title ?? undefined,
            audioDuration: pt.track?.audio?.duration ?? undefined,
            ...pt,
          };
        })
      : undefined,
    featuredImage: post.featuredImage && {
      ...post.featuredImage,
      src: storedImageFileUrl(post.featuredImage),
    },
    isContentHidden: !contentVisible,
    content: !contentVisible ? extractFirstParagraph(content ?? "") : content,
  } as Serialized<T> & {
    trackCount: number;
    isContentHidden: boolean;
  };
};
