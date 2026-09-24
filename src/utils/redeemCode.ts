import prisma from "@mirlo/prisma";

import { serializeTrackGroupPurchase } from "../serializers/trackGroup";

import { AppError } from "./error";
import { registerPurchase } from "./trackGroup";
import { findOrCreateUserBasedOnEmail } from "./user";

/**
 * A code can be redeemed from the release it belongs to, or from the artist it
 * belongs to — the latter lets an artist hand out one `/artistname/redeem`
 * address for every release rather than one per release (#577).
 */
export type RedeemScope = { trackGroupId: number } | { profileId: number };

const trackGroupInclude = {
  profile: true,
  tracks: {
    include: {
      audio: true,
    },
    where: {
      deletedAt: null,
    },
  },
};

/**
 * Looks up an unredeemed download code within the given scope and hands the
 * release to the purchaser, registering a zero-price purchase for them.
 */
export const redeemDownloadCode = async ({
  code,
  scope,
  userId,
  email,
}: {
  code: string;
  scope: RedeemScope;
  userId?: number;
  email?: string;
}) => {
  const downloadCode = await prisma.trackGroupDownloadCodes.findFirst({
    where: {
      downloadCode: code,
      redeemedByUser: null,
      ...("trackGroupId" in scope
        ? { trackGroupId: scope.trackGroupId }
        : {
            // The soft-delete extension only auto-filters the model being
            // queried, so a deleted release has to be excluded by hand here.
            trackGroup: { profileId: scope.profileId, deletedAt: null },
          }),
    },
    include: {
      trackGroup: {
        include: trackGroupInclude,
      },
    },
  });

  if (!downloadCode || !downloadCode.trackGroup) {
    throw new AppError({
      httpCode: 404,
      description: "Code not found or already used.",
    });
  }

  if (!userId && !email) {
    throw new AppError({
      httpCode: 400,
      description: "Need to be either logged in or supply email address",
    });
  }

  const { user: purchaser } = await findOrCreateUserBasedOnEmail(
    email as string,
    userId
  );

  if (!purchaser) {
    throw new AppError({
      httpCode: 400,
      description: "Need to be either logged in or supply email address",
    });
  }

  await prisma.trackGroupDownloadCodes.update({
    where: {
      id: downloadCode.id,
    },
    data: {
      redeemedByUserId: purchaser.id,
    },
  });

  const purchase = await registerPurchase({
    userId: purchaser.id,
    trackGroupId: downloadCode.trackGroup.id,
    pricePaid: 0,
    currencyPaid: "usd",
    paymentProcessorKey: null,
  });

  return {
    trackGroup: downloadCode.trackGroup,
    purchase: purchase ? serializeTrackGroupPurchase(purchase) : purchase,
  };
};
