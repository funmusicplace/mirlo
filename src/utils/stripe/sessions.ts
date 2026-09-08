import prisma, { SECRET_USER_FIELDS } from "@mirlo/prisma";
import { Prisma, User } from "@mirlo/prisma/client";
import Stripe from "stripe";

import { logger } from "../../logger";
import { getPlatformFeeForArtist } from "../artist";
import { AppError } from "../error";
import { generateFullStaticImageUrl } from "../images";
import { finalArtistAvatarBucket } from "../minio";
import {
  calculateAppFee,
  calculatePlatformPercent,
  castToFixed,
} from "../processingPayments";

import stripe, { createSubscriptionStripeProduct } from ".";
const { API_DOMAIN } = process.env;

const buildCheckoutCancelSearchParams = ({
  artistId,
  clientId,
  reason = "user_canceled",
}: {
  artistId: string | number;
  clientId?: string | number | null;
  reason?: string;
}) => {
  const params = new URLSearchParams({
    canceled: "true",
    reason,
  });

  if (clientId !== undefined && clientId !== null) {
    params.set("clientId", clientId.toString());
  }

  params.set("artistId", artistId.toString());

  return params;
};

export const createStripeCheckoutSessionForCatalogue = async ({
  loggedInUser,
  email,
  priceNumber,
  artist,
  message,
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  message?: string;
  artist: Prisma.ProfileGetPayload<{
    include: {
      user: { omit: typeof SECRET_USER_FIELDS };
      avatar: true;
    };
  }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });
  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const currency = await getCurrency(artist.id, stripeAccountId);

  const cancelUrlParams = buildCheckoutCancelSearchParams({
    artistId: artist.id,
    clientId: client?.id,
  });

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          priceNumber,
          currency,
          await getPlatformFeeForArtist(artist.id),
          stripeAccount.country
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: castToFixed(priceNumber),
            currency,
            product_data: {
              name: `Entire digital catalogue of ${artist.name}`,
              description: `You're purchasing ${artist.name}'s entire digital catalogue`,
              images: artist.avatar
                ? [
                    generateFullStaticImageUrl(
                      artist.avatar?.url[4],
                      finalArtistAvatarBucket
                    ),
                  ]
                : [],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        purchaseType: "artistCatalogue",
        artistId: artist.id,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        message: message ?? null,
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?${cancelUrlParams.toString()}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const getCurrency = async (
  artistId: number,
  stripeAccountId: string
): Promise<string> => {
  const artist = await prisma.profile.findUnique({
    where: {
      id: artistId,
    },
    select: { paymentToUserId: true, userId: true },
  });
  if (artist) {
    const user = await prisma.user.findFirst({
      where: {
        id: artist.paymentToUserId ?? artist.userId,
      },
    });
    if (user?.currency) {
      return user.currency.toLowerCase();
    }
  }
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account.default_currency ?? "usd";
  } catch {
    return "usd";
  }
};

export const createCheckoutSessionForSubscription = async ({
  loggedInUser,
  email,
  stripeAccountId,
  artistId,
  tier,
  amount,
  userName,
  embedded = false,
}: {
  loggedInUser?: User;
  email?: string;
  stripeAccountId: string;
  artistId: number;
  tier: Prisma.ProfileSubscriptionTierGetPayload<{
    include: { profile: true };
  }>;
  amount: number;
  /** Optional self-chosen display name, captured when the buyer has no account name. */
  userName?: string;
  // In-app callers opt in to embedded so the Stripe form renders inline
  // (#1168). External callers (links from email, third-party embeds, etc.)
  // leave this off and get a hosted Stripe checkout URL they can redirect to.
  embedded?: boolean;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });
  const productKey = await createSubscriptionStripeProduct(
    tier,
    stripeAccountId
  );
  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  logger.info(`Created a new product for artist ${artistId}, ${productKey}`);

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const currency = await getCurrency(tier.profileId, stripeAccountId);
  const platformPercent = await calculatePlatformPercent(
    currency,
    tier.platformPercent,
    stripeAccount.country
  );

  const cancelUrlParams = buildCheckoutCancelSearchParams({
    artistId: artistId,
    clientId: client?.id,
  });
  const returnUrl = `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`;

  // Embedded checkout (in-app) and hosted checkout (external callers) need
  // different field sets — Stripe rejects sessions that mix them. Pick one
  // up front from the caller's intent.
  const checkoutSurface: Stripe.Checkout.SessionCreateParams = embedded
    ? {
        ui_mode: "embedded",
        redirect_on_completion: "if_required",
        return_url: returnUrl,
      }
    : {
        success_url: returnUrl,
        cancel_url: `${API_DOMAIN}/v1/checkout?${cancelUrlParams.toString()}`,
      };

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      shipping_address_collection: tier.collectAddress
        ? {
            allowed_countries: ["US", "GB", "CA", "AU", "NZ"],
          }
        : undefined,
      customer_email: loggedInUser?.email || email,
      subscription_data:
        platformPercent > 0
          ? {
              application_fee_percent: platformPercent,
            }
          : undefined,
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: tier.allowVariable
              ? amount || (tier.minAmount ?? 0)
              : (tier.minAmount ?? 0),
            currency: currency ?? "usd",
            product: productKey,
            recurring: {
              interval: tier.interval === "YEAR" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        artistId: artistId,
        purchaseType: "subscription",
        subscribed: 1,
        tierId: tier.id,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        ...(userName?.trim() && { userName: userName.trim() }),
        stripeAccountId,
      },
      mode: "subscription",
      ...checkoutSurface,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
  return session;
};
