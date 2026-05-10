import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

export const getUserSubscriptionForArtist = async (
  user: User | undefined,
  artistId: number
) => {
  if (!user) return null;
  return prisma.artistUserSubscription.findFirst({
    where: {
      userId: user.id,
      artistSubscriptionTier: { artistId },
    },
    orderBy: { amount: "desc" },
    select: { amount: true, artistSubscriptionTierId: true },
  });
};

export const canUserSeePostContent = (
  post: {
    isPublic: boolean;
    minimumSubscriptionTier?: { minAmount: number | null } | null;
    postSubscriptionTiers: { artistSubscriptionTierId: number }[];
  },
  context: {
    isArtistOwner: boolean;
    subscription: { amount: number; artistSubscriptionTierId: number } | null;
  }
): boolean => {
  if (post.isPublic || context.isArtistOwner) return true;
  if (!context.subscription) return false;
  return (
    (post.minimumSubscriptionTier?.minAmount ?? 0) <=
      context.subscription.amount ||
    post.postSubscriptionTiers.some(
      (t) =>
        t.artistSubscriptionTierId ===
        context.subscription!.artistSubscriptionTierId
    )
  );
};
