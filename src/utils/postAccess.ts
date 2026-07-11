import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

export const getUserSubscriptionForProfile = async (
  user: User | undefined,
  profileId: number
) => {
  if (!user) return null;
  return prisma.profileUserSubscription.findFirst({
    where: {
      userId: user.id,
      profileSubscriptionTier: { profileId: profileId },
    },
    orderBy: { amount: "desc" },
    select: { amount: true, profileSubscriptionTierId: true },
  });
};

export const canUserSeePostContent = (
  post: {
    isPublic: boolean;
    minimumSubscriptionTier?: { minAmount: number | null } | null;
    postSubscriptionTiers: { profileSubscriptionTierId: number }[];
  },
  context: {
    isProfileOwner: boolean;
    subscription: { amount: number; profileSubscriptionTierId: number } | null;
  }
): boolean => {
  if (post.isPublic || context.isProfileOwner) return true;
  if (!context.subscription) return false;
  return (
    (post.minimumSubscriptionTier?.minAmount ?? 0) <=
      context.subscription.amount ||
    post.postSubscriptionTiers.some(
      (t) =>
        t.profileSubscriptionTierId ===
        context.subscription!.profileSubscriptionTierId
    )
  );
};
