import prisma from "@mirlo/prisma";

import { AppError } from "../error";
import { determinePrice } from "../purchasing";
import { minimumPledge } from "../stripe/currency";

import { getPaymentProcessor, type DeferredQuote } from "./PaymentProcessor";
import { resolveProfilePaymentContext } from "./purchase";

export const initiateFundraiserPledge = async ({
  profileId,
  fundraiserId,
  price,
  message,
  userEmail,
  userId,
  deferred,
  checkoutId,
}: {
  profileId: number;
  fundraiserId: number;
  price?: string;
  message?: string;
  userEmail: string;
  userId?: number;
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
  const fundraiser = await prisma.fundraiser.findFirst({
    where: { id: fundraiserId, profileId },
  });
  if (!fundraiser) {
    throw new AppError({
      httpCode: 404,
      description: "Fundraiser not found",
    });
  }

  if (!fundraiser.isAllOrNothing || fundraiser.status !== "ACTIVE") {
    throw new AppError({
      httpCode: 400,
      description: "This fundraiser is not currently accepting pledges",
    });
  }

  const { stripeAccountId, currency } =
    await resolveProfilePaymentContext(profileId);

  const { priceNumber } = determinePrice(
    price,
    minimumPledge(fundraiser.minPledge, currency)
  );

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

  if (!userId || !userEmail) {
    throw new AppError({
      httpCode: 401,
      description: "Log in or verify your email to pledge",
    });
  }

  const { setupIntentId, clientSecret } =
    await getPaymentProcessor().createOnlinePledgeSetup({
      fundraiserId,
      profileId,
      accountId: stripeAccountId,
      amount: priceNumber,
      currency,
      userEmail,
      userId: userId ? String(userId) : undefined,
      message,
      checkoutId,
    });

  return { clientSecret, stripeAccountId, setupIntentId };
};
