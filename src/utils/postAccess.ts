import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

export const getUserSubscriptionsForProfile = async (
  user: User | undefined,
  profileId: number
): Promise<ProfileSubscription[]> => {
  if (!user) return [];
  return prisma.profileUserSubscription.findMany({
    where: {
      userId: user.id,
      profileSubscriptionTier: { profileId },
    },
    orderBy: { amount: "desc" },
    select: { amount: true, profileSubscriptionTierId: true },
  });
};

export type ProfileSubscription = {
  amount: number;
  profileSubscriptionTierId: number;
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
    isProfileOwner: boolean;
    subscriptions: ProfileSubscription[];
  }
): boolean => {
  if (post.isPublic || context.isProfileOwner) return true;
  if (context.subscriptions.length === 0) return false;

  const addressedTiers = post.postSubscriptionTiers ?? [];

  if (addressedTiers.length > 0) {
    return context.subscriptions.some((subscription) =>
      addressedTiers.some(
        (tier) =>
          tier.profileSubscriptionTierId ===
          subscription.profileSubscriptionTierId
      )
    );
  }

  const minimumAmount = post.minimumSubscriptionTier?.minAmount ?? 0;
  return context.subscriptions.some(
    (subscription) => subscription.amount >= minimumAmount
  );
};

/** Owner / tier-aware visibility — same rules as `/v1/posts/{id}`. */
export const getCanUserSeePostContent = async (
  user: User | undefined,
  post: PostAccessFields
): Promise<boolean> => {
  const isProfileOwner = !!(user && post.profile?.userId === user.id);
  const subscriptions = post.profileId
    ? await getUserSubscriptionsForProfile(user, post.profileId)
    : [];
  return canUserSeePostContent(post, { isProfileOwner, subscriptions });
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
