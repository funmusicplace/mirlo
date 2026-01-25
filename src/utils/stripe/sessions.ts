import Stripe from "stripe";
import prisma from "@mirlo/prisma";
import { Prisma, User, MerchShippingDestination } from "@mirlo/prisma/client";
import { logger } from "../../logger";

import { generateFullStaticImageUrl } from "../images";
import { finalArtistAvatarBucket } from "../minio";
import { AppError } from "../error";

import countryCodesCurrencies from "../country-codes-currencies";
import { getPlatformFeeForArtist } from "../artist";

import {
  calculateAppFee,
  calculatePlatformPercent,
  castToFixed,
} from "../processingPayments";
import stripe, {
  createMerchStripeProduct,
  createSubscriptionStripeProduct,
  createTrackGroupStripeProduct,
  createTrackStripeProduct,
  findOrCreateStripeCustomer,
} from ".";
const { STRIPE_KEY, API_DOMAIN } = process.env;

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

export const createStripeCheckoutSessionForTrackPurchase = async ({
  loggedInUser,
  email,
  message,
  priceNumber,
  track,
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  message?: string;
  track: Prisma.TrackGetPayload<{
    include: {
      trackGroup: { include: { artist: true; cover: true } };
      trackArtists: true;
    };
  }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const productKey = await createTrackStripeProduct(track, stripeAccountId);

  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  const currency = track.trackGroup.currency?.toLowerCase() ?? "usd";

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          priceNumber,
          currency,
          track.trackGroup.platformPercent
        ),
      },
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: castToFixed(priceNumber),
            currency,
            product: productKey,
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        purchaseType: "track",
        trackId: track.id,
        trackGroupId: track.trackGroupId,
        artistId: track.trackGroup.artistId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        message: message ?? null,
      },
      mode: "payment",
      return_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
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
  artist: Prisma.ArtistGetPayload<{ include: { user: true; avatar: true } }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const currency = artist.user.currency?.toLowerCase() ?? "usd";

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
          await getPlatformFeeForArtist(artist.id)
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

export const createStripeCheckoutSessionForPurchase = async ({
  loggedInUser,
  email,
  priceNumber,
  trackGroup,
  stripeAccountId,
  message,
}: {
  loggedInUser?: User;
  email?: string;
  message?: string;
  priceNumber: number;
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { artist: true; cover: true };
  }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const productKey = await createTrackGroupStripeProduct(
    trackGroup,
    stripeAccountId
  );

  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  const currency = trackGroup.currency?.toLowerCase() ?? "usd";

  const customer = await findOrCreateStripeCustomer(
    stripeAccountId,
    loggedInUser?.id,
    email
  );

  if (trackGroup.fundraiserId) {
    const fundraiser = await prisma.fundraiser.findFirst({
      where: {
        id: trackGroup.fundraiserId,
      },
    });

    if (fundraiser?.isAllOrNothing) {
      // For all or nothing track groups, we need to create a setupIntent for the payment
      // which we will charge when the project hits its goal.
      const setupIntent = await stripe.setupIntents.create(
        {
          customer: customer.id,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            fundraiserId: fundraiser.id,
            trackGroupId: trackGroup.id,
            userId: loggedInUser?.id ?? null,
            paymentIntentAmount: priceNumber,
            message: message ? message : null,
            stripeAccountId,
          },
        },
        { stripeAccount: stripeAccountId }
      );
      return setupIntent;
    }
  }
  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          priceNumber,
          currency,
          trackGroup.platformPercent
        ),
      },
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: castToFixed(priceNumber),
            currency,
            product: productKey,
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        purchaseType: "trackGroup",
        trackGroupId: trackGroup.id,
        message: message ?? null,
        artistId: trackGroup.artistId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "payment",
      return_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

const stripeBannedDestinations =
  "AS, CX, CC, CU, HM, IR, KP, MH, FM, NF, MP, PW, SD, SY, UM, VI".split(", ");

const SCHENGEN_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "CZ",
  "DE",
  "EE",
  "ES",
  "FI",
  "GR",
  "HR",
  "HU",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

const determineShipping = (
  shippingDestinations: MerchShippingDestination[],
  shippingDestinationId: string,
  quantity: number = 0
) => {
  const isShippingToSchengen = SCHENGEN_COUNTRY_CODES.includes(
    shippingDestinationId.toUpperCase()
  );

  const euCosts = shippingDestinations.find(
    (s) => s.destinationCountry === "EU"
  );

  const destination = isShippingToSchengen
    ? { currency: "usd", ...euCosts, destinationCountry: shippingDestinationId }
    : shippingDestinations.find((s) => s.id === shippingDestinationId);

  if (!destination) {
    throw new AppError({
      httpCode: 400,
      description:
        "Supplied destination isn't a valid destination for the seller",
    });
  }

  let possibleDestinations = [destination.destinationCountry];

  if (
    destination.destinationCountry === "" ||
    destination.destinationCountry === null
  ) {
    const specificShippingCosts = shippingDestinations.filter(
      (d) => d.destinationCountry !== ""
    );

    possibleDestinations = countryCodesCurrencies
      .map((country) => {
        const inSpecific = specificShippingCosts.find(
          (d) => d.destinationCountry === country.countryCode
        );
        const banned = stripeBannedDestinations.includes(country.countryCode);
        if (banned || inSpecific) return null;
        return country.countryCode;
      })
      .filter((country) => !!country);
  }

  const destinationCost =
    (destination.costUnit ?? 0) +
    (quantity > 1 ? (quantity - 1) * (destination?.costExtraUnit ?? 0) : 0);

  return {
    shipping_rate_data: {
      display_name: `Shipping to ${!!destination.destinationCountry ? destination.destinationCountry : "Everywhere"}`,
      fixed_amount: {
        currency: destination?.currency,
        amount: castToFixed(destinationCost),
      },
      type: "fixed_amount" as "fixed_amount",
    },
    destinationCodes: possibleDestinations,
  };
};

export const createStripeCheckoutSessionForMerchPurchase = async ({
  loggedInUser,
  email,
  priceNumber,
  merch,
  message,
  quantity,
  options,
  stripeAccountId,
  shippingDestinationId,
}: {
  loggedInUser?: User;
  email?: string;
  message?: string;
  priceNumber: number;
  quantity: number;
  merch: Prisma.MerchGetPayload<{
    include: { artist: true; images: true; shippingDestinations: true };
  }>;
  options: {
    merchOptionIds: string[];
  };
  shippingDestinationId: string;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const productKey = await createMerchStripeProduct(
    merch,
    stripeAccountId,
    options
  );

  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  const currency = merch.currency?.toLowerCase() ?? "usd";

  const destinations = determineShipping(
    merch.shippingDestinations,
    shippingDestinationId,
    quantity
  );

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries:
          destinations.destinationCodes as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: [
        { shipping_rate_data: destinations.shipping_rate_data },
      ],
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          priceNumber,
          currency,
          merch.platformPercent
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: castToFixed(priceNumber),
            currency,
            product: productKey,
          },
          quantity,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        merchId: merch.id,
        purchaseType: "merch",
        artistId: merch.artistId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        message: message ?? null,
      },
      mode: "payment",
      ui_mode: "embedded",
      return_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const createStripeCheckoutSessionForTip = async ({
  loggedInUser,
  email,
  priceNumber,
  stripeAccountId,
  currency,
  message,
  artistId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  currency: string;
  stripeAccountId: string;
  artistId: number;
  message?: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const cancelUrlParams = buildCheckoutCancelSearchParams({
    artistId,
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
          await getPlatformFeeForArtist(artistId)
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: castToFixed(priceNumber),
            currency: currency?.toLowerCase() ?? "usd",
            product_data: { name: "Mirlo One Time Tip" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: client?.id ?? null,
        artistId: artistId,
        gaveGift: 1,
        message: message ?? null,
        purchaseType: "tip",
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?${cancelUrlParams.toString()}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const createCheckoutSessionForSubscription = async ({
  loggedInUser,
  email,
  stripeAccountId,
  artistId,
  tier,
  amount,
}: {
  loggedInUser?: User;
  email?: string;
  stripeAccountId: string;
  artistId: number;
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>;
  amount: number;
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
  const cancelUrlParams = buildCheckoutCancelSearchParams({
    artistId,
    clientId: client?.id,
  });

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      shipping_address_collection: tier.collectAddress
        ? {
            allowed_countries: ["US", "GB", "CA", "AU", "NZ"],
          }
        : undefined,
      customer_email: loggedInUser?.email || email,
      subscription_data: {
        application_fee_percent: await calculatePlatformPercent(
          tier.currency,
          tier.platformPercent
        ),
      },
      line_items: [
        {
          price_data: {
            tax_behavior: "exclusive",
            unit_amount: tier.allowVariable
              ? amount || (tier.minAmount ?? 0)
              : (tier.minAmount ?? 0),
            currency: tier.currency ?? "USD",
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
        artistId,
        purchaseType: "subscription",
        subscribed: 1,
        tierId: tier.id,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "subscription",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?${cancelUrlParams.toString()}`,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
  return session;
};
