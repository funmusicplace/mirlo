import prisma from "@mirlo/prisma";
import { Prisma, User, MerchShippingDestination } from "@mirlo/prisma/client";
import Stripe from "stripe";

import { logger } from "../../logger";
import { getPlatformFeeForArtist } from "../artist";
import countryCodesCurrencies from "../country-codes-currencies";
import { AppError } from "../error";
import { generateFullStaticImageUrl } from "../images";
import { finalProfileAvatarBucket } from "../minio";
import {
  calculateAppFee,
  calculatePlatformPercent,
  castToFixed,
} from "../processingPayments";
import { calculateDiscountedPrice } from "../purchasing";

import stripe, {
  createMerchStripeProduct,
  createSubscriptionStripeProduct,
  createTrackGroupStripeProduct,
  createTrackStripeProduct,
  findOrCreateStripeCustomer,
} from ".";
const { API_DOMAIN } = process.env;

const buildCheckoutCancelSearchParams = ({
  profileId,
  clientId,
  reason = "user_canceled",
}: {
  profileId: string | number;
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

  params.set("artistId", profileId.toString());

  return params;
};

const buildCheckoutLineItemsWithDiscount = ({
  priceNumber,
  currency,
  productKey,
  quantity = 1,
  discountPercent,
}: {
  priceNumber: number;
  currency: string;
  productKey: string;
  quantity?: number;
  discountPercent?: number | null;
}) => {
  const { normalizedDiscountPercent, discountAmount, discountedPriceNumber } =
    calculateDiscountedPrice(priceNumber, discountPercent);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        unit_amount: castToFixed(priceNumber - (discountAmount ?? 0)),
        currency,
        product: productKey,
      },
      quantity,
    },
  ];

  return {
    lineItems,
    normalizedDiscountPercent,
    discountAmount,
    discountedPriceNumber,
  };
};

export const createStripeCheckoutSessionForTrackPurchase = async ({
  loggedInUser,
  email,
  message,
  priceNumber,
  track,
  stripeAccountId,
  discountPercent,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  message?: string;
  track: Prisma.TrackGetPayload<{
    include: {
      trackGroup: { include: { profile: true; cover: true } };
      trackArtists: true;
    };
  }>;
  stripeAccountId: string;
  discountPercent?: number | null;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);

  const productKey = await createTrackStripeProduct(track, stripeAccountId);

  if (!productKey) {
    throw new AppError({
      description: "Was not able to create a product for user",
      httpCode: 500,
    });
  }

  const currency = await getCurrency(
    track.trackGroup.profileId,
    stripeAccountId
  );

  const {
    lineItems,
    normalizedDiscountPercent,
    discountAmount,
    discountedPriceNumber,
  } = buildCheckoutLineItemsWithDiscount({
    priceNumber,
    currency,
    productKey,
    discountPercent,
  });

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(
          discountedPriceNumber,
          currency,
          track.trackGroup.platformPercent,
          stripeAccount.country
        ),
      },
      ui_mode: "embedded",
      redirect_on_completion: "if_required",
      line_items: lineItems,
      metadata: {
        clientId: client?.id ?? null,
        purchaseType: "track",
        trackId: track.id,
        trackGroupId: track.trackGroupId,
        profileId: track.trackGroup.profileId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        message: message ?? null,
        discountPercent: normalizedDiscountPercent,
        discountAmount: discountAmount,
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
  artist: Prisma.ProfileGetPayload<{ include: { user: true; avatar: true } }>;
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
    profileId: artist.id,
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
                      finalProfileAvatarBucket
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
        profileId: artist.id,
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
  discountPercent,
}: {
  loggedInUser?: User;
  email?: string;
  message?: string;
  priceNumber: number;
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { profile: true; cover: true };
  }>;
  stripeAccountId: string;
  discountPercent?: number | null;
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
  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const currency = await getCurrency(trackGroup.profileId, stripeAccountId);

  const {
    lineItems,
    normalizedDiscountPercent,
    discountAmount,
    discountedPriceNumber,
  } = buildCheckoutLineItemsWithDiscount({
    priceNumber,
    currency,
    productKey,
    discountPercent,
  });

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

    // Pledge flow (setupIntent rather than direct charge) only applies while
    // the fundraiser is still ACTIVE — once the artist marks it SUCCESSFUL
    // via Charge pledges, buyers should hit the regular checkout instead.
    // See #1681.
    if (fundraiser?.isAllOrNothing && fundraiser.status === "ACTIVE") {
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
          discountedPriceNumber,
          currency,
          trackGroup.platformPercent,
          stripeAccount.country
        ),
      },
      ui_mode: "embedded",
      redirect_on_completion: "if_required",
      line_items: lineItems,
      metadata: {
        clientId: client?.id ?? null,
        purchaseType: "trackGroup",
        trackGroupId: trackGroup.id,
        message: message ?? null,
        profileId: trackGroup.profileId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        discountPercent: normalizedDiscountPercent,
        discountAmount: discountAmount,
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
  currency: string,
  quantity: number = 0
) => {
  const isShippingToSchengen = SCHENGEN_COUNTRY_CODES.includes(
    shippingDestinationId.toUpperCase()
  );

  const euCosts = shippingDestinations.find(
    (s) => s.destinationCountry === "EU"
  );

  const destination = isShippingToSchengen
    ? { ...euCosts, destinationCountry: shippingDestinationId }
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
        currency,
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
  discountPercent,
}: {
  loggedInUser?: User;
  email?: string;
  message?: string;
  priceNumber: number;
  quantity: number;
  merch: Prisma.MerchGetPayload<{
    include: { profile: true; images: true; shippingDestinations: true };
  }>;
  options: {
    merchOptionIds: string[];
  };
  shippingDestinationId: string;
  stripeAccountId: string;
  discountPercent?: number | null;
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

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const currency = await getCurrency(merch.profileId, stripeAccountId);

  const destinations = determineShipping(
    merch.shippingDestinations,
    shippingDestinationId,
    currency,
    quantity
  );

  const {
    lineItems,
    discountedPriceNumber,
    normalizedDiscountPercent,
    discountAmount,
  } = buildCheckoutLineItemsWithDiscount({
    priceNumber,
    currency,
    productKey,
    quantity,
    discountPercent,
  });

  const suffix = merch.title.replace(/[^a-zA-Z]/g, "").substring(0, 20);

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
        ...(!!suffix && { statement_descriptor_suffix: suffix }),
        application_fee_amount: await calculateAppFee(
          discountedPriceNumber,
          currency,
          merch.platformPercent,
          stripeAccount.country
        ),
      },
      line_items: lineItems,
      metadata: {
        clientId: client?.id ?? null,
        merchId: merch.id,
        purchaseType: "merch",
        profileId: merch.profileId,
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
        message: message ?? null,
        discountPercent: normalizedDiscountPercent,
        discountAmount: discountAmount,
      },
      mode: "payment",
      ui_mode: "embedded",
      redirect_on_completion: "if_required",
      return_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
};

export const getCurrency = async (
  profileId: number,
  stripeAccountId: string
): Promise<string> => {
  const artist = await prisma.profile.findUnique({
    where: {
      id: profileId,
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
  profileId,
  tier,
  amount,
  userName,
  embedded = false,
}: {
  loggedInUser?: User;
  email?: string;
  stripeAccountId: string;
  profileId: number;
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

  logger.info(`Created a new product for artist ${profileId}, ${productKey}`);

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const currency = await getCurrency(tier.profileId, stripeAccountId);
  const platformPercent = await calculatePlatformPercent(
    currency,
    tier.platformPercent,
    stripeAccount.country
  );

  const cancelUrlParams = buildCheckoutCancelSearchParams({
    profileId,
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
        profileId,
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
