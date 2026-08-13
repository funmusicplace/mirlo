// Fundraiser pledges: a payment-method authorisation (SetupIntent) collected
// up front, charged later — only if/when the fundraiser's all-or-nothing goal
// is met (see chargePledgePayments in src/utils/stripe/index.ts). Kept
// separate from purchase.ts (immediate charges) and subscription.ts
// (recurring billing) since a pledge is neither.

import prisma from "@mirlo/prisma";

import { AppError } from "../error";
import { determinePrice } from "../purchasing";

import { getPaymentProcessor } from "./PaymentProcessor";
import { resolveArtistPaymentContext } from "./purchase";

export const initiateFundraiserPledge = async ({
  artistId,
  fundraiserId,
  trackGroupId,
  price,
  message,
  userEmail,
  userId,
}: {
  artistId: number;
  fundraiserId: number;
  trackGroupId: number;
  /** User-submitted pledge amount, in cents (as a string, matching the other item types' `price`). */
  price?: string;
  message?: string;
  userEmail: string;
  userId?: number;
}): Promise<{
  clientSecret: string | null;
  stripeAccountId: string;
  setupIntentId: string;
}> => {
  const trackGroup = await prisma.trackGroup.findFirst({
    where: { id: trackGroupId, profileId: artistId, fundraiserId },
    include: { fundraiser: true },
  });
  if (!trackGroup) {
    throw new AppError({
      httpCode: 404,
      description: "TrackGroup not found for this fundraiser",
    });
  }

  const fundraiser = trackGroup.fundraiser;
  // Pledges (SetupIntent, charged later) only apply while the fundraiser is
  // still ACTIVE — once the artist marks it SUCCESSFUL (goal met, pledges
  // charged) or FAILED, there's nothing left to pledge toward.
  if (!fundraiser?.isAllOrNothing || fundraiser.status !== "ACTIVE") {
    throw new AppError({
      httpCode: 400,
      description: "This fundraiser is not currently accepting pledges",
    });
  }

  const { priceNumber } = determinePrice(price, trackGroup.minPrice);

  const { stripeAccountId } = await resolveArtistPaymentContext(artistId);

  const { setupIntentId, clientSecret } =
    await getPaymentProcessor().createOnlinePledgeSetup({
      fundraiserId,
      trackGroupId,
      artistId,
      accountId: stripeAccountId,
      amount: priceNumber,
      userEmail,
      userId: userId ? String(userId) : undefined,
      message,
    });

  return { clientSecret, stripeAccountId, setupIntentId };
};
