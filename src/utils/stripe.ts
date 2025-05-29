import Stripe from "stripe";
import prisma from "@mirlo/prisma";
import { Prisma, User, MerchShippingDestination } from "@mirlo/prisma/client";
import { logger } from "../logger";
import { Request, Response } from "express";
import { findOrCreateUserBasedOnEmail } from "./user";
import { getSiteSettings } from "./settings";
import { generateFullStaticImageUrl } from "./images";
import { finalArtistAvatarBucket, finalCoversBucket } from "./minio";
import { AppError } from "./error";
import {
  handleArtistGift,
  handleArtistMerchPurchase,
  handleCataloguePurchase,
  handleSubscription,
  handleTrackGroupPurchase,
  handleTrackPurchase,
} from "./handleFinishedTransactions";
import countryCodesCurrencies from "./country-codes-currencies";
import { manageSubscriptionReceipt } from "./subscription";

const { STRIPE_KEY, API_DOMAIN } = process.env;

export const OPTION_JOINER = ";;";

let stripeConfig: Stripe.StripeConfig = { apiVersion: "2023-08-16" };

if (process.env.NODE_ENV === "test") {
  const { STRIPE_HOST, STRIPE_PORT, STRIPE_PROTOCOL } = process.env;
  stripeConfig = {
    ...stripeConfig,
    host: STRIPE_HOST,
    port: STRIPE_PORT,
    protocol: STRIPE_PROTOCOL === "http" ? "http" : "https",
  };
}

export const stripe = new Stripe(STRIPE_KEY ?? "", stripeConfig);

const calculatePlatformPercent = async (
  currency: string,
  percent?: number | null
) => {
  const settings = await getSiteSettings();
  if (currency.toLowerCase() === "brl" || currency.toLowerCase() === "mxn") {
    return 0;
  }
  return (percent ?? settings.platformPercent ?? 7) / 100;
};

const castToFixed = (val: number) => {
  return Number(val.toFixed());
};

export const calculateAppFee = async (
  price: number,
  currency: string,
  platformPercent?: number | null
) => {
  const calculatedPlatformPercent = await calculatePlatformPercent(
    currency,
    platformPercent
  );

  const appFee = castToFixed(price * calculatedPlatformPercent);
  return appFee || 0;
};

const buildProductDescription = async (
  title: string | null,
  artistName: string,
  itemDescription?: string | null,
  options?: { merchOptionIds?: string[] }
) => {
  let about =
    itemDescription && itemDescription !== ""
      ? itemDescription
      : `${title} by ${artistName}.`;

  if (options?.merchOptionIds) {
    const foundOptions = await prisma.merchOption.findMany({
      where: {
        id: { in: options.merchOptionIds },
      },
      include: {
        merchOptionType: true,
      },
    });

    if (foundOptions.length > 0) {
      about += `\n
    ${foundOptions.map((o) => `${o.merchOptionType.optionName}: ${o.name}\n`)}
      `;
    }
  }

  return about;
};

const checkForProductKey = async (
  stripeProductKey: string | null,
  stripeAccountId: string,
  options?: { merchOptionIds?: string[] }
) => {
  if (options?.merchOptionIds && options?.merchOptionIds?.length > 0) {
    const products = await stripe.products.search({
      query: `metadata["merchOptionIds"]:"${options.merchOptionIds.join(OPTION_JOINER)}"`,
    });
    return products.data[0]?.id;
  }
  let productKey = stripeProductKey;
  if (productKey) {
    try {
      await stripe.products.retrieve(productKey, {
        stripeAccount: stripeAccountId,
      });
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("No such product")) {
          logger.error("Weird, product doesn't exist", e.message);
          productKey = null;
        }
      }
    }
  }
  return productKey;
};

/**
 * For Merch we don't store the stripeProductKey on the merch unless there are no options
 * @param merch
 * @param stripeAccountId
 * @param options
 * @returns
 */
export const createMerchStripeProduct = async (
  merch: Prisma.MerchGetPayload<{
    include: { artist: true; images: true };
  }>,
  stripeAccountId: string,
  options?: { merchOptionIds?: string[] }
) => {
  let productKey = await checkForProductKey(
    merch.stripeProductKey,
    stripeAccountId,
    options
  );
  const about = await buildProductDescription(
    merch.title,
    merch.artist.name,
    merch.description,
    options
  );
  if (!productKey) {
    const product = await stripe.products.create(
      {
        name: `${merch.title} by ${merch.artist.name}`,
        description: about,
        tax_code: "txcd_99999999",
        metadata: {
          merchOptionIds: options?.merchOptionIds
            ? options?.merchOptionIds.join(OPTION_JOINER)
            : null,
        },
        images:
          merch.images?.length > 0
            ? [
                generateFullStaticImageUrl(
                  merch.images?.[0]?.url[4],
                  finalCoversBucket
                ),
              ]
            : [],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    // do not set a product key if there are options
    if (
      !options ||
      !options.merchOptionIds ||
      options.merchOptionIds.length === 0
    ) {
      await prisma.merch.update({
        where: {
          id: merch.id,
        },
        data: {
          stripeProductKey: product.id,
        },
      });
    }
    productKey = product.id;
  }

  return productKey;
};

export const createTrackGroupStripeProduct = async (
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { artist: true; cover: true };
  }>,
  stripeAccountId: string
) => {
  let productKey = await checkForProductKey(
    trackGroup.stripeProductKey,
    stripeAccountId
  );

  if (!productKey) {
    const about = await buildProductDescription(
      trackGroup.title,
      trackGroup.artist.name,
      trackGroup.about
    );
    const product = await stripe.products.create(
      {
        name: `${trackGroup.title} by ${trackGroup.artist.name}`,
        description: about,
        tax_code: "txcd_10401100",
        images: trackGroup.cover
          ? [
              generateFullStaticImageUrl(
                trackGroup.cover?.url[4],
                finalCoversBucket
              ),
            ]
          : [],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    await prisma.trackGroup.update({
      where: {
        id: trackGroup.id,
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }

  return productKey;
};

export const createTrackStripeProduct = async (
  track: Prisma.TrackGetPayload<{
    include: {
      trackGroup: { include: { artist: true; cover: true } };
      trackArtists: true;
    };
  }>,
  stripeAccountId: string
) => {
  let productKey = await checkForProductKey(
    track.stripeProductKey,
    stripeAccountId
  );

  if (!productKey) {
    const trackArtist =
      track.trackArtists?.length > 0
        ? track.trackArtists.map((a) => a.artistName).join(", ")
        : track.trackGroup.artist.name;

    const about = await buildProductDescription(
      track.title,
      trackArtist,
      track.description
    );

    const product = await stripe.products.create(
      {
        name: `${track.title} by ${trackArtist}`,
        description: about,
        tax_code: "txcd_10401100",
        images: track.trackGroup.cover
          ? [
              generateFullStaticImageUrl(
                track.trackGroup.cover?.url[4],
                finalCoversBucket
              ),
            ]
          : [],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    await prisma.track.update({
      where: {
        id: track.id,
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }

  return productKey;
};

export const createSubscriptionStripeProduct = async (
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>,
  stripeAccountId: string
) => {
  let productKey = await checkForProductKey(
    tier.stripeProductKey,
    stripeAccountId
  );

  if (!productKey) {
    const product = await stripe.products.create(
      {
        name: `Supporting ${tier.artist.name} at ${tier.name}`,
        description: tier.description || "Thank you for your support!",
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    await prisma.artistSubscriptionTier.update({
      where: {
        id: Number(tier.id),
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }
  return productKey;
};

export const createStripeCheckoutSessionForTrackPurchase = async ({
  loggedInUser,
  email,
  priceNumber,
  track,
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
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
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
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
  stripeAccountId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  artist: Prisma.ArtistGetPayload<{ include: { user: true; avatar: true } }>;
  stripeAccountId: string;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const currency = artist.user.currency?.toLowerCase() ?? "usd";

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(priceNumber, currency),
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
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
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
}: {
  loggedInUser?: User;
  email?: string;
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

const determineShipping = (
  shippingDestinations: MerchShippingDestination[],
  shippingDestinationId: string,
  quantity: number = 0
) => {
  const destination = shippingDestinations.find(
    (s) => s.id === shippingDestinationId
  );

  if (!destination) {
    throw new AppError({
      httpCode: 400,
      description:
        "Supplied destination isn't a valid destination for the seller",
    });
  }

  let possibleDestinations = [destination.destinationCountry];

  if (
    destination?.destinationCountry === "" ||
    destination?.destinationCountry === null
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

  return {
    shipping_rate_data: {
      display_name: `Shipping to ${!!destination.destinationCountry ? destination.destinationCountry : "Everywhere"}`,
      fixed_amount: {
        currency: destination?.currency,
        amount: castToFixed(
          destination?.costUnit +
            (quantity > 1 ? quantity * destination?.costExtraUnit : 0)
        ),
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
  quantity,
  options,
  stripeAccountId,
  shippingDestinationId,
}: {
  loggedInUser?: User;
  email?: string;
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
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
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
  artistId,
}: {
  loggedInUser?: User;
  email?: string;
  priceNumber: number;
  currency: string;
  stripeAccountId: string;
  artistId: number;
}) => {
  const client = await prisma.client.findFirst({
    where: {
      applicationName: "frontend",
    },
  });

  const session = await stripe.checkout.sessions.create(
    {
      billing_address_collection: "auto",
      customer_email: loggedInUser?.email || email,
      payment_intent_data: {
        application_fee_amount: await calculateAppFee(priceNumber, currency),
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
        purchaseType: "tip",
        userId: loggedInUser?.id ?? null,
        userEmail: email ?? null,
        stripeAccountId,
      },
      mode: "payment",
      success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
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
      cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
  return session;
};

export const verifyStripeSignature = async (
  req: Request,
  res: Response,
  signingSecret?: string
) => {
  const signature = req.headers["stripe-signature"];
  let event = req.body;
  if (signingSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(
        // See https://stackoverflow.com/a/70951912/154392
        // @ts-ignore
        req.rawBody,
        signature ?? "",
        signingSecret
      );
    } catch (e) {
      console.error(
        `⚠️  Webhook signature verification failed.`,
        (e as Error).message
      );
      return res.sendStatus(400);
    }
  }

  return event;
};

type SessionMetaData = {
  tierId: string;
  userEmail: string;
  userId: string;
  trackGroupId: string;
  stripeAccountId: string;
  gaveGift: string;
  merchId: string;
  artistId: string;
  trackId: string;
  purchaseType: string;
};

export const handleCheckoutSession = async (
  session: Stripe.Checkout.Session
) => {
  try {
    const metadata = session.metadata as unknown as SessionMetaData;
    const {
      tierId,
      merchId,
      trackGroupId,
      stripeAccountId,
      gaveGift,
      purchaseType,
      trackId,
      artistId,
    } = metadata;
    let { userId, userEmail } = metadata;
    userEmail = userEmail || (session.customer_details?.email ?? "");
    logger.info(
      `checkout.session: ${session.id}, stripeAccountId: ${stripeAccountId}, tierId: ${tierId}, trackGroupId: ${trackGroupId}, trackId: ${trackId}, artistId: ${artistId}, gaveGift: ${gaveGift}`
    );
    logger.info(
      `checkout.session: ${session.id}, have user info: userId: ${userId} userEmail: ${userEmail}`
    );
    session = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      },
      { stripeAccount: stripeAccountId }
    );

    // If the user doesn't exist, we create one with an existing userEmail
    let { userId: actualUserId, newUser } = await findOrCreateUserBasedOnEmail(
      userEmail,
      userId
    );
    logger.info(`checkout.session: ${session.id} Processing session`);
    if (purchaseType === "tip") {
      logger.info(`checkout.session: ${session.id} handling tip`);
      await handleArtistGift(Number(actualUserId), Number(artistId), session);
    } else if (purchaseType === "merch") {
      logger.info(`checkout.session: ${session.id} handling merch`);
      await handleArtistMerchPurchase(
        Number(actualUserId),
        session,
        stripeAccountId
      );
    } else if (purchaseType === "subscription") {
      logger.info(`checkout.session: ${session.id} handling subscription`);
      await handleSubscription(Number(actualUserId), Number(tierId), session);
    } else if (purchaseType === "trackGroup") {
      logger.info(`checkout.session: ${session.id} handleTrackGroupPurchase`);
      await handleTrackGroupPurchase(
        Number(actualUserId),
        Number(trackGroupId),
        session,
        newUser
      );
    } else if (purchaseType === "track") {
      logger.info(`checkout.session: ${session.id} handleTrackPurchase`);
      await handleTrackPurchase(
        Number(actualUserId),
        Number(trackId),
        session,
        newUser
      );
    } else if (purchaseType === "catalogue") {
      logger.info(`checkout.session: ${session.id} handleCataloguePurchase`);
      await handleCataloguePurchase(
        Number(actualUserId),
        Number(artistId),
        session,
        newUser
      );
    }
  } catch (e) {
    console.error(e);
  }
};

export const handleInvoicePaid = async (invoice: Stripe.Invoice) => {
  const subscription = invoice.subscription;
  logger.info(`invoice.paid: ${invoice.id} for ${subscription}`);
  if (typeof subscription === "string") {
    await manageSubscriptionReceipt({
      paymentProcessor: "stripe",
      processorPaymentReferenceId: invoice.id,
      processorSubscriptionReferenceId: subscription,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
    });
  }
};

export const handleAccountUpdate = async (account: Stripe.Account) => {
  logger.info(`account.update: received update for ${account.id}`);
};

export default stripe;
