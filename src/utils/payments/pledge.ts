import prisma from "@mirlo/prisma";

import { AppError } from "../error";
import { determinePrice } from "../purchasing";

import { getPaymentProcessor, type DeferredQuote } from "./PaymentProcessor";
import { resolveProfilePaymentContext } from "./purchase";

export const initiateFundraiserPledge = async ({
  profileId,
  fundraiserId,
  trackGroupId,
  price,
  message,
  userEmail,
  userId,
  successUrl,
  deferred,
  checkoutId,
}: {
  profileId: number;
  fundraiserId: number;
  trackGroupId: number;
  price?: string;
  message?: string;
  userEmail: string;
  userId?: number;
  successUrl?: string;
  deferred?: boolean;
  checkoutId?: string;
}): Promise<
  | { deferred: DeferredQuote }
  | {
      clientSecret: string | null;
      stripeAccountId: string;
      setupIntentId: string;
    }
> => {
  const trackGroup = await prisma.trackGroup.findFirst({
    where: { id: trackGroupId, profileId, fundraiserId },
    include: { fundraiser: true },
  });
  if (!trackGroup) {
    throw new AppError({
      httpCode: 404,
      description: "TrackGroup not found for this fundraiser",
    });
  }

  const fundraiser = trackGroup.fundraiser;

  if (!fundraiser?.isAllOrNothing || fundraiser.status !== "ACTIVE") {
    throw new AppError({
      httpCode: 400,
      description: "This fundraiser is not currently accepting pledges",
    });
  }

  const { priceNumber } = determinePrice(price, trackGroup.minPrice);

  const { stripeAccountId, currency } =
    await resolveProfilePaymentContext(profileId);

  if (deferred) {
    return {
      deferred: {
        mode: "setup",
        currency,
        stripeAccountId,
        requiresShipping: false,
      },
    };
  }

  if (!userEmail) {
    throw new AppError({
      httpCode: 400,
      description: "An email is required to pledge",
    });
  }

  const { setupIntentId, clientSecret } =
    await getPaymentProcessor().createOnlinePledgeSetup({
      fundraiserId,
      trackGroupId,
      profileId,
      accountId: stripeAccountId,
      amount: priceNumber,
      userEmail,
      userId: userId ? String(userId) : undefined,
      message,
      successUrl,
      checkoutId,
    });

  return { clientSecret, stripeAccountId, setupIntentId };
};
