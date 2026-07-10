import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

export const getUserSubscriptionForArtist = async (
  user: User | undefined,
  artistId: number
) => {
  if (!user) return null;
  return prisma.profileUserSubscription.findFirst({
    where: {
      userId: user.id,
      profileSubscriptionTier: { profileId: artistId },
    },
    orderBy: { amount: "desc" },
    select: { amount: true, profileSubscriptionTierId: true },
  });
};

type PostAccessFields = {
  isPublic: boolean;
  profileId?: number | null;
  profile?: { userId?: number } | null;
  minimumSubscriptionTier?: { minAmount: number | null } | null;
  postSubscriptionTiers?: { profileSubscriptionTierId: number }[];
};

export const canUserSeePostContent = (
  post: PostAccessFields,
  context: {
    isArtistOwner: boolean;
    subscription: { amount: number; profileSubscriptionTierId: number } | null;
  }
): boolean => {
  if (post.isPublic || context.isArtistOwner) return true;
  if (!context.subscription) return false;
  return (
    (post.minimumSubscriptionTier?.minAmount ?? 0) <=
      context.subscription.amount ||
    (post.postSubscriptionTiers ?? []).some(
      (t) =>
        t.profileSubscriptionTierId ===
        context.subscription!.profileSubscriptionTierId
    )
  );
};

/** Owner / tier-aware visibility — same rules as `/v1/posts/{id}`. */
export const getCanUserSeePostContent = async (
  user: User | undefined,
  post: PostAccessFields
): Promise<boolean> => {
  const isArtistOwner = !!(user && post.profile?.userId === user.id);
  const subscription = post.profileId
    ? await getUserSubscriptionForArtist(user, post.profileId)
    : null;
  return canUserSeePostContent(post, { isArtistOwner, subscription });
};

type PostTracksForPurchases = {
  tracks?: {
    trackId: number;
    track?: { trackGroupId?: number | null } | null;
  }[];
};

/** Purchase rows needed by `serializePost` for `isPlayable`. */
export const loadPurchasesForPostTracks = async (
  user: User | undefined,
  post: PostTracksForPurchases
) => {
  if (!user) {
    return {
      userTrackGroupPurchases: undefined as
        | Awaited<ReturnType<typeof prisma.userTrackGroupPurchase.findMany>>
        | undefined,
      userTrackPurchases: undefined as
        | Awaited<ReturnType<typeof prisma.userTrackPurchase.findMany>>
        | undefined,
    };
  }

  const trackGroupIds =
    post.tracks
      ?.map((t) => t.track?.trackGroupId)
      .filter((id): id is number => id != null) ?? [];
  const trackIds = post.tracks?.map((t) => t.trackId) ?? [];

  const [userTrackGroupPurchases, userTrackPurchases] = await Promise.all([
    prisma.userTrackGroupPurchase.findMany({
      where: {
        userId: user.id,
        trackGroupId: { in: trackGroupIds },
      },
    }),
    prisma.userTrackPurchase.findMany({
      where: {
        userId: user.id,
        trackId: { in: trackIds },
      },
    }),
  ]);

  return { userTrackGroupPurchases, userTrackPurchases };
};
