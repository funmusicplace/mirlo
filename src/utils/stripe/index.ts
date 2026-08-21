import prisma from "@mirlo/prisma";
import {
  Prisma,
  User,
  FundraiserPledge,
  Fundraiser,
  TrackGroup,
} from "@mirlo/prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response } from "express";
import Stripe from "stripe";

import { logger } from "../../logger";
import { subscribeUserToArtist } from "../artist";
import { AppError } from "../error";
import { getClient } from "../getClient";
import {
  getFeesFromPaymentIntent,
  getPlatformCurrencyValueFromIntent,
  handleArtistGift,
  handleCataloguePurchase,
  handleFundraiserPledge,
  handleFundraiserPledgePaymentFailure,
  handleFundraiserPledgePaymentSuccess,
  handleSubscription,
  handleTrackGroupPurchase,
  handleTrackPurchase,
  PlatformCurrencyValue,
  sendSaleEmails,
  withPlatformCurrency,
} from "../handleFinishedTransactions";
import { generateFullStaticImageUrl } from "../images";
import { decrementMerchStock } from "../merch";
import { finalCoversBucket, finalMerchImageBucket } from "../minio";
import {
  calculateAppFee,
  calculatePlatformPercent,
} from "../processingPayments";
import { manageSubscriptionReceipt } from "../subscription";
import { registerSubscription } from "../subscriptionTier";
import { createOrUpdatePledge } from "../trackGroup";
import { findOrCreateUserBasedOnEmail, updateCurrencies } from "../user";

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

let stripeClient = new Stripe(process.env.STRIPE_KEY ?? "", stripeConfig);

/**
 * If the user updates this through the Settings, we need to reload the client.
 * @returns Stripe key
 */
export const refreshStripeClient = async (): Promise<string> => {
  try {
    const row = await prisma.settings.findFirst();
    const dbKey = (row?.settings as { stripe?: { key?: string } } | null)
      ?.stripe?.key;
    const apiKey =
      dbKey && dbKey.trim() ? dbKey : (process.env.STRIPE_KEY ?? "");
    stripeClient = new Stripe(apiKey, stripeConfig);
    return apiKey;
  } catch (e) {
    logger.error(`refreshStripeClient: failed to load key from settings`, e);
    return process.env.STRIPE_KEY ?? "";
  }
};

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(stripeClient as unknown as object, prop, stripeClient);
  },
});

export const createOnlinePaymentIntent = async ({
  amount,
  currency,
  stripeAccountId,
  applicationFeeAmount,
  metadata,
}: {
  amount: number;
  currency: string;
  stripeAccountId: string;
  applicationFeeAmount: number;
  metadata: Record<string, string>;
}) => {
  return stripe.paymentIntents.create(
    {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      ...(applicationFeeAmount > 0 && {
        application_fee_amount: applicationFeeAmount,
      }),
      metadata,
    },
    { stripeAccount: stripeAccountId }
  );
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

const createOrReuseStripeProduct = async ({
  existingProductKey,
  stripeAccountId,
  searchOptions,
  buildCreateParams,
  persistProductKey,
}: {
  existingProductKey: string | null;
  stripeAccountId: string;
  searchOptions?: { merchOptionIds?: string[] };
  buildCreateParams: () => Promise<Stripe.ProductCreateParams>;
  persistProductKey?: (productKey: string) => Promise<unknown>;
}): Promise<string> => {
  let productKey = await checkForProductKey(
    existingProductKey,
    stripeAccountId,
    searchOptions
  );

  if (!productKey) {
    const product = await stripe.products.create(await buildCreateParams(), {
      stripeAccount: stripeAccountId,
    });
    if (persistProductKey) {
      await persistProductKey(product.id);
    }
    productKey = product.id;
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
    include: { profile: true; images: true };
  }>,
  stripeAccountId: string,
  options?: { merchOptionIds?: string[] }
) => {
  const hasOptions = !!options?.merchOptionIds?.length;

  return createOrReuseStripeProduct({
    existingProductKey: merch.stripeProductKey,
    stripeAccountId,
    searchOptions: options,
    buildCreateParams: async () => ({
      name: `${merch.title} by ${merch.profile.name}`,
      description: await buildProductDescription(
        merch.title,
        merch.profile.name,
        merch.description,
        options
      ),
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
                finalMerchImageBucket
              ),
            ]
          : [],
    }),
    // do not set a product key if there are options
    persistProductKey: hasOptions
      ? undefined
      : (productKey) =>
          prisma.merch.update({
            where: { id: merch.id },
            data: { stripeProductKey: productKey },
          }),
  });
};

export const findOrCreateStripeCustomer = async (
  stripeAccountId: string,
  userId?: number,
  email?: string
) => {
  let user;
  let searchEmail = email;
  if (userId) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    searchEmail = user?.email ?? email;
  }

  const existingCustomer = searchEmail
    ? await stripe.customers.list(
        {
          email: searchEmail,
        },
        {
          stripeAccount: stripeAccountId,
        }
      )
    : null;

  if (existingCustomer && existingCustomer.data.length > 0) {
    return existingCustomer.data[0];
  }
  const customer = await stripe.customers.create(
    {
      email: searchEmail,
      metadata: {
        userId: user?.id ?? null,
      },
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  return customer;
};

export const createTrackGroupStripeProduct = async (
  trackGroup: Prisma.TrackGroupGetPayload<{
    include: { profile: true; cover: true };
  }>,
  stripeAccountId: string
) => {
  return createOrReuseStripeProduct({
    existingProductKey: trackGroup.stripeProductKey,
    stripeAccountId,
    buildCreateParams: async () => ({
      name: `${trackGroup.title} by ${trackGroup.profile.name}`,
      description: await buildProductDescription(
        trackGroup.title,
        trackGroup.profile.name,
        trackGroup.about
      ),
      tax_code: "txcd_10401100",
      images: trackGroup.cover
        ? [
            generateFullStaticImageUrl(
              trackGroup.cover?.url[4],
              finalCoversBucket
            ),
          ]
        : [],
    }),
    persistProductKey: (productKey) =>
      prisma.trackGroup.update({
        where: { id: trackGroup.id },
        data: { stripeProductKey: productKey },
      }),
  });
};

export const createTrackStripeProduct = async (
  track: Prisma.TrackGetPayload<{
    include: {
      trackGroup: { include: { profile: true; cover: true } };
      trackArtists: true;
    };
  }>,
  stripeAccountId: string
) => {
  const trackArtist =
    track.trackArtists?.length > 0
      ? track.trackArtists.map((a) => a.artistName).join(", ")
      : track.trackGroup.profile.name;

  return createOrReuseStripeProduct({
    existingProductKey: track.stripeProductKey,
    stripeAccountId,
    buildCreateParams: async () => ({
      name: `${track.title} by ${trackArtist}`,
      description: await buildProductDescription(
        track.title,
        trackArtist,
        track.description
      ),
      tax_code: "txcd_10401100",
      images: track.trackGroup.cover
        ? [
            generateFullStaticImageUrl(
              track.trackGroup.cover?.url[4],
              finalCoversBucket
            ),
          ]
        : [],
    }),
    persistProductKey: (productKey) =>
      prisma.track.update({
        where: { id: track.id },
        data: { stripeProductKey: productKey },
      }),
  });
};

export const createSubscriptionStripeProduct = async (
  tier: Prisma.ProfileSubscriptionTierGetPayload<{
    include: { profile: true };
  }>,
  stripeAccountId: string
) => {
  return createOrReuseStripeProduct({
    existingProductKey: tier.stripeProductKey,
    stripeAccountId,
    buildCreateParams: async () => ({
      name: `Supporting ${tier.profile.name} at ${tier.name}`,
      description: tier.description || "Thank you for your support!",
    }),
    persistProductKey: (productKey) =>
      prisma.profileSubscriptionTier.update({
        where: { id: Number(tier.id) },
        data: { stripeProductKey: productKey },
      }),
  });
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
  userName: string;
  trackGroupId: string;
  stripeAccountId: string;
  gaveGift: string;
  merchId: string;
  artistId: string;
  trackId: string;
  transactionId: string;
  purchaseType:
    | "trackGroup"
    | "subscription"
    | "merch"
    | "tip"
    | "track"
    | "artistCatalogue"
    | "fundraiserPledge";
};

export const handleCheckoutSession = async (
  session: Stripe.Checkout.Session
) => {
  try {
    const metadata = session.metadata as unknown as SessionMetaData;
    const {
      tierId,
      trackGroupId,
      stripeAccountId,
      purchaseType,
      trackId,
      artistId,
    } = metadata;
    let { userId, userEmail } = metadata;
    const { userName } = metadata;
    userEmail = userEmail || (session.customer_details?.email ?? "");
    logger.info(
      `checkout.session: ${session.id}, stripeAccountId: ${stripeAccountId}, ${JSON.stringify(metadata)}`
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

    let { userId: actualUserId, newUser } = await findOrCreateUserBasedOnEmail(
      userEmail,
      userId,
      userName
    );
    logger.info(`checkout.session: ${session.id} Processing session`);
    if (purchaseType === "tip") {
      logger.info(`checkout.session: ${session.id} handling tip`);
      await handleArtistGift(Number(actualUserId), Number(artistId), session);
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
      await handleTrackPurchase(Number(actualUserId), Number(trackId), session);
    } else if (purchaseType === "artistCatalogue") {
      logger.info(`checkout.session: ${session.id} handleCataloguePurchase`);
      await handleCataloguePurchase(
        Number(actualUserId),
        Number(artistId),
        session
      );
    }
  } catch (e) {
    console.error(e);
  }
};

export const handleSetupIntentSucceeded = async (
  setupIntent: Stripe.SetupIntent
) => {
  logger.info(`setup_intent.succeeded: ${setupIntent.id}`);
  const intent = await stripe.setupIntents.retrieve(setupIntent.id, {
    stripeAccount: setupIntent.metadata?.stripeAccountId,
  });

  const metadata = setupIntent.metadata as unknown as {
    subscriptionKey?: string;
    fundraiserId?: string;
    userId: string;
    userEmail: string;
    userName?: string;
    tierId?: string;
    amount: string;
    currency: string;
    stripeAccountId: string;
    oldTierId?: string;
    oldStripeSubscriptionKey?: string;
    shippingAddress?: string; // JSON
  };

  if (metadata.subscriptionKey) {
    await handleSubscriptionPaymentMethodUpdateSucceeded(
      intent,
      metadata.subscriptionKey,
      metadata.stripeAccountId
    );
    return;
  }

  const { fundraiserId, userId, userEmail, userName } = metadata;

  let {
    userId: actualUserId,
    user,
    newUser,
  } = await findOrCreateUserBasedOnEmail(userEmail, userId, userName);

  if (fundraiserId) {
    const fundraiser = await prisma.fundraiser.findUnique({
      where: {
        id: Number(fundraiserId),
      },
      include: {
        trackGroups: {
          include: {
            profile: {
              include: {
                user: true,
                subscriptionTiers: true,
              },
            },
          },
        },
      },
    });

    if (fundraiser) {
      await createOrUpdatePledge({
        userId: Number(actualUserId),
        fundraiserId: fundraiser.id,
        message: intent.metadata?.message,
        amount: Number(intent.metadata?.paymentIntentAmount),
        stripeSetupIntentId: intent.id,
      });
      await subscribeUserToArtist(fundraiser.trackGroups[0].profile, user);
    }
  } else if (metadata.tierId) {
    const {
      tierId,
      amount,
      currency,
      stripeAccountId,
      oldTierId,
      oldStripeSubscriptionKey,
    } = metadata;

    const paymentMethodId =
      typeof intent.payment_method === "string"
        ? intent.payment_method
        : intent.payment_method?.id;

    if (!paymentMethodId) {
      logger.error(
        `handleSetupIntentSucceeded: no payment_method on setup intent ${intent.id}`
      );
      return;
    }

    let shippingAddress: {
      name?: string;
      address: Record<string, unknown>;
    } | null = null;
    if (metadata.shippingAddress) {
      try {
        shippingAddress = JSON.parse(metadata.shippingAddress);
      } catch (e) {
        logger.error(
          `handleSetupIntentSucceeded: could not parse shippingAddress metadata on ${intent.id}`,
          e
        );
      }
    }

    await finalizeSubscriptionSetup({
      stripeAccountId,
      paymentMethodId,
      tierId: Number(tierId),
      amount: Number(amount),
      currency,
      userId: Number(actualUserId),
      userEmail,
      oldTierId: oldTierId ? Number(oldTierId) : undefined,
      oldStripeSubscriptionKey,
      shippingAddress,
    });
  }
};

/**
 * Attaches the buyer's shipping address to a not-yet-confirmed subscription
 */
export const attachSetupIntentShippingAddress = async ({
  setupIntentId,
  stripeAccountId,
  shippingAddress,
}: {
  setupIntentId: string;
  stripeAccountId: string;
  shippingAddress: { name?: string; address: Record<string, unknown> };
}) => {
  await stripe.setupIntents.update(
    setupIntentId,
    { metadata: { shippingAddress: JSON.stringify(shippingAddress) } },
    { stripeAccount: stripeAccountId }
  );
};

/**
 * PaymentIntent ids are prefixed `pi_`, SetupIntent ids `seti_`.
 */
export const isSetupIntentId = (id: string) => id.startsWith("seti_");

/**
 * Attaches the user's identity to an intent.
 */
export const attachIntentIdentity = async ({
  id,
  stripeAccountId,
  userId,
  userEmail,
}: {
  id: string;
  stripeAccountId: string;
  userId?: number;
  userEmail: string;
}) => {
  const isSetupIntent = isSetupIntentId(id);

  const existing = isSetupIntent
    ? await stripe.setupIntents.retrieve(
        id,
        {},
        { stripeAccount: stripeAccountId }
      )
    : await stripe.paymentIntents.retrieve(
        id,
        {},
        { stripeAccount: stripeAccountId }
      );

  const existingUserId = existing.metadata?.userId;
  if (existingUserId && existingUserId !== String(userId)) {
    throw new AppError({
      httpCode: 409,
      description: "This purchase is already associated with a different buyer",
    });
  }

  const metadata: Record<string, string> = {
    userEmail,
    ...(userId !== undefined && { userId: String(userId) }),
  };

  if (isSetupIntent) {
    await stripe.setupIntents.update(
      id,
      { metadata },
      { stripeAccount: stripeAccountId }
    );
  } else {
    await stripe.paymentIntents.update(
      id,
      { metadata },
      { stripeAccount: stripeAccountId }
    );
  }
};

/**
 * Update the payment method of a subscription
 */
export const handleSubscriptionPaymentMethodUpdateSucceeded = async (
  intent: Stripe.SetupIntent,
  subscriptionKey: string,
  stripeAccountId: string
) => {
  const paymentMethodId =
    typeof intent.payment_method === "string"
      ? intent.payment_method
      : intent.payment_method?.id;

  if (!paymentMethodId) {
    logger.error(
      `handleSubscriptionPaymentMethodUpdateSucceeded: no payment_method on setup intent ${intent.id}`
    );
    return;
  }

  await stripe.subscriptions.update(
    subscriptionKey,
    { default_payment_method: paymentMethodId },
    { stripeAccount: stripeAccountId }
  );

  logger.info(
    `handleSubscriptionPaymentMethodUpdateSucceeded: updated default payment method for subscription ${subscriptionKey}`
  );
};

/**
 * Finalizes the subscription set up, whether made by a terminal or online.
 */
export const finalizeSubscriptionSetup = async ({
  stripeAccountId,
  paymentMethodId,
  tierId,
  amount,
  currency,
  userId,
  userEmail,
  oldTierId,
  oldStripeSubscriptionKey,
  shippingAddress = null,
}: {
  stripeAccountId: string;
  paymentMethodId: string;
  tierId: number;
  amount: number;
  currency: string;
  userId: number;
  userEmail?: string;
  oldTierId?: number;
  oldStripeSubscriptionKey?: string;
  shippingAddress?: { name?: string; address: Record<string, unknown> } | null;
}) => {
  const [tier, customer] = await Promise.all([
    prisma.profileSubscriptionTier.findFirst({
      where: { id: tierId, deletedAt: null },
      include: { profile: true },
    }),
    findOrCreateStripeCustomer(stripeAccountId, userId, userEmail),
  ]);

  if (!tier) {
    logger.error(`finalizeSubscriptionSetup: tier ${tierId} not found`);
    return;
  }

  if (!oldTierId) {
    const existingSubscription = await prisma.profileUserSubscription.findFirst(
      {
        where: {
          userId,
          deletedAt: null,
          profileSubscriptionTier: { profileId: tier.profileId },
        },
        orderBy: { createdAt: "desc" },
      }
    );
    if (existingSubscription) {
      oldTierId = existingSubscription.profileSubscriptionTierId;
      oldStripeSubscriptionKey =
        oldStripeSubscriptionKey ??
        existingSubscription.stripeSubscriptionKey ??
        undefined;
    }
  }

  const platformPercent = await calculatePlatformPercent(
    currency || "usd",
    tier.platformPercent ?? tier.profile.defaultPlatformFee
  );

  const [, productKey] = await Promise.all([
    stripe.paymentMethods.attach(
      paymentMethodId,
      { customer: customer.id },
      { stripeAccount: stripeAccountId }
    ),
    createSubscriptionStripeProduct(tier, stripeAccountId),
  ]);

  const subscription = await stripe.subscriptions.create(
    {
      customer: customer.id,
      items: [
        {
          price_data: {
            currency,
            product: productKey,
            unit_amount: amount,
            recurring: {
              interval: tier.interval === "YEAR" ? "year" : "month",
            },
          },
        },
      ],
      default_payment_method: paymentMethodId,
      application_fee_percent: platformPercent,
      metadata: {
        tierId: String(tier.id),
        userId: String(userId),
        stripeAccountId,
        purchaseType: "subscription",
      },
    },
    { stripeAccount: stripeAccountId }
  );

  await registerSubscription({
    userId,
    tierId: tier.id,
    amount,
    paymentProcessorKey: subscription.id,
    platformCut: Math.round((amount * platformPercent) / 100),
    shippingAddress,
  });

  // Cancel the specific old subscription.
  if (
    oldStripeSubscriptionKey &&
    oldStripeSubscriptionKey !== subscription.id
  ) {
    try {
      await stripe.subscriptions.cancel(oldStripeSubscriptionKey, {
        stripeAccount: stripeAccountId,
      });
    } catch (e) {
      logger.error(
        `finalizeSubscriptionSetup: failed to cancel old subscription ${oldStripeSubscriptionKey}`,
        e
      );
    }
  }

  if (oldTierId && oldTierId !== tier.id) {
    await prisma.profileUserSubscription.deleteMany({
      where: { userId, profileSubscriptionTierId: oldTierId },
    });
  }

  logger.info(
    `finalizeSubscriptionSetup: created subscription ${subscription.id} for user ${userId}, tier ${tier.id}`
  );
};

export const chargePledgePayments = async (
  pledge: FundraiserPledge & { user: User } & {
    fundraiser: Fundraiser & {
      trackGroups: (TrackGroup & {
        profile: { urlSlug: string; user: { stripeAccountId: string | null } };
      })[];
    };
  }
) => {
  const client = await getClient();

  if (!pledge.fundraiser.trackGroups[0].profile.user.stripeAccountId) {
    throw new AppError({
      description: "Artist does not have a connected stripe account",
      httpCode: 400,
    });
  }

  const stripeAccountId =
    pledge.fundraiser.trackGroups[0].profile.user.stripeAccountId;

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  try {
    logger.info(
      `Charging pledge payments for fundraiser ${pledge.fundraiser.id} and user ${pledge.userId}`
    );
    const customersForEmail = await stripe.customers.list(
      {
        email: pledge.user.email,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    const customerId = customersForEmail.data[0]?.id;
    logger.info(
      `Found e-mail: ${pledge.user.email}, stripe customerId: ${customerId}`
    );

    if (customerId) {
      const paymentMethods = await stripe.paymentMethods.list(
        {
          customer: customerId,
        },
        {
          stripeAccount: stripeAccountId,
        }
      );
      logger.info(
        "Found stripe paymentMethodId: " + paymentMethods.data[0]?.id
      );
      const currency = stripeAccount.default_currency ?? "usd";

      if (paymentMethods.data[0]?.id) {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: pledge.amount,
            currency: currency,
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: { enabled: true },
            customer: customerId,
            payment_method: paymentMethods.data[0]?.id,
            return_url: `${client.applicationUrl}/${pledge.fundraiser.trackGroups[0].profile.urlSlug}/release/${pledge.fundraiser.trackGroups[0].urlSlug}`,
            off_session: true,
            confirm: true,
            application_fee_amount: await calculateAppFee(
              pledge.amount,
              currency,
              pledge.fundraiser.trackGroups[0].platformPercent,
              stripeAccount.country
            ),
            metadata: {
              userId: pledge.userId,
              fundraiserId: pledge.fundraiserId,
              pledgeId: pledge.id,
              purchaseType: "fundraiserPledge",
            },
          },
          {
            stripeAccount: stripeAccountId,
          }
        );
        logger.info(
          `Created payment intent ${paymentIntent.id} for pledge ${pledge.id}`
        );

        await handleFundraiserPledge(pledge, paymentIntent.id, currency);
      }
    }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.log("Error code is: ", err.code);
      if (
        err.raw &&
        typeof err.raw === "object" &&
        "payment_intent" in err.raw &&
        err.raw.payment_intent &&
        typeof err.raw.payment_intent === "object" &&
        "id" in err.raw.payment_intent &&
        typeof err.raw.payment_intent.id === "string"
      ) {
        console.log(
          "Error was with PaymentIntent ID: ",
          err.raw.payment_intent.id
        );
      }
      console.log("Error code:", err.code);
      console.log("Error message: ", err.message);
      console.log("Full error: ", err);
    }
  }
};

const getFeeDetailsFromInvoice = async (
  invoice: Stripe.Invoice,
  accountId: string
) => {
  const paymentIntent = invoice.payment_intent;

  const intent = await stripe.paymentIntents.retrieve(
    paymentIntent as string,
    {
      expand: ["latest_charge.balance_transaction"],
    },
    { stripeAccount: accountId }
  );
  const { paymentProcessorFee } = await getFeesFromPaymentIntent(
    intent,
    accountId
  );
  return { paymentProcessorFee, intent };
};

export const handleInvoicePaid = async (
  invoice: Stripe.Invoice,
  accountId: string
) => {
  const subscription = invoice.subscription;
  logger.info(`invoice.paid: ${invoice.id} for ${subscription}`);
  if (typeof subscription === "string") {
    const { paymentProcessorFee } = await getFeeDetailsFromInvoice(
      invoice,
      accountId
    );

    // Fetch subscription to get next billing date
    let nextBillingDate: Date | undefined;
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription,
        { stripeAccount: accountId }
      );
      if (stripeSubscription.current_period_end) {
        nextBillingDate = new Date(
          stripeSubscription.current_period_end * 1000
        );
      }
    } catch (error) {
      logger.error(
        `invoice.paid: Failed to fetch subscription ${subscription}: ${error}`
      );
    }

    await manageSubscriptionReceipt({
      processorPaymentReferenceId: invoice.id,
      processorSubscriptionReferenceId: subscription,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      platformCut: invoice.application_fee_amount || 0,
      paymentProcessorFee,
      billingReason: invoice.billing_reason,
      status: "COMPLETED",
      nextBillingDate,
    });
  }
};

export const handleInvoicePaymentFailed = async (
  invoice: Stripe.Invoice,
  accountId: string
) => {
  const subscription = invoice.subscription;
  logger.info(`invoice.failed: ${invoice.id} for ${subscription}`);

  const metadata = invoice.metadata as unknown as SessionMetaData;

  if (
    typeof subscription === "string" &&
    metadata.purchaseType === "subscription" &&
    metadata.tierId &&
    metadata.userId &&
    Number.isFinite(+metadata.userId)
  ) {
    const { intent, paymentProcessorFee } = await getFeeDetailsFromInvoice(
      invoice,
      accountId
    );
    const clientSecret = intent.client_secret;
    const urlParams = `clientSecret=${clientSecret}&stripeAccountId=${accountId}`;
    await manageSubscriptionReceipt({
      status: "FAILED",
      urlParams,
      processorPaymentReferenceId: invoice.id,
      processorSubscriptionReferenceId: subscription,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      billingReason: invoice.billing_reason,
      platformCut: invoice.application_fee_amount || 0,
      paymentProcessorFee,
    });
  }
};

export const handlePaymentIntentFailed = async (
  intent: Stripe.PaymentIntent,
  accountId: string
) => {
  logger.info(`payment_intent.payment_failed: ${intent.id}`);
  intent.metadata = intent.metadata || {};

  const { purchaseType, transactionId } =
    intent.metadata as unknown as SessionMetaData;

  if (
    purchaseType === "fundraiserPledge" &&
    transactionId &&
    intent.status === "requires_payment_method"
  ) {
    const secret = intent.client_secret;
    const urlParams = `clientSecret=${secret}&stripeAccountId=${accountId}`;
    await handleFundraiserPledgePaymentFailure(transactionId, urlParams);
  }
};

/**
 * Fires when Stripe ends a subscription. either we scheduled it to
 * cancel at period end (eg. a user cancelled it) or because Stripe
 * gave up its retries after repeated payment failures.
 */
export const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription
) => {
  logger.info(`customer.subscription.deleted: ${subscription.id}`);

  const isPaymentFailure =
    subscription.cancellation_details?.reason === "payment_failed";
  const deleteReason = isPaymentFailure ? "PAYMENT_FAILURE" : undefined;

  const rows = await prisma.profileUserSubscription.findMany({
    where: {
      stripeSubscriptionKey: subscription.id,
      deletedAt: null,
    },
    include: { profileSubscriptionTier: true },
  });

  for (const row of rows) {
    if (row.keepFollowingOnCancel && !isPaymentFailure) {
      const defaultTier = await prisma.profileSubscriptionTier.findFirst({
        where: {
          profileId: row.profileSubscriptionTier.profileId,
          isDefaultTier: true,
          deletedAt: null,
        },
      });

      if (defaultTier) {
        await prisma.profileUserSubscription.update({
          where: { id: row.id },
          data: {
            profileSubscriptionTierId: defaultTier.id,
            amount: 0,
            platformCut: null,
            stripeSubscriptionKey: null,
            nextBillingDate: null,
            keepFollowingOnCancel: false,
          },
        });
        logger.info(
          `customer.subscription.deleted: ${subscription.id} downgraded subscription ${row.id} to the free tier instead of deleting`
        );
        continue;
      }
    }

    await prisma.profileUserSubscription.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        ...(deleteReason ? { deleteReason } : {}),
      },
    });
  }

  logger.info(
    `customer.subscription.deleted: ${subscription.id} processed ${rows.length} subscription(s)`
  );
};

type MerchPurchaseItem = {
  type: "merch";
  id: string;
  quantity?: number;
  amount: number;
  optionIds?: string[];
};

export const handleMerchPurchasesFromIntent = async (
  userId: number,
  items: MerchPurchaseItem[],
  paymentIntent: Stripe.PaymentIntent,
  stripeAccountId: string,
  platformCurrencyValue?: PlatformCurrencyValue
) => {
  const merchItems = items.filter((item) => item.type === "merch");
  if (merchItems.length === 0) return;

  let applicationFee = paymentIntent.application_fee_amount ?? 0;
  let stripeFee = 0;

  try {
    ({ applicationFee, paymentProcessorFee: stripeFee } =
      await getFeesFromPaymentIntent(paymentIntent, stripeAccountId));
  } catch (e) {
    logger.warn(
      `handleMerchPurchasesFromIntent: could not retrieve fees: ${e}`
    );
  }

  const transaction = await prisma.userTransaction.create({
    data: {
      userId,
      amount: merchItems.reduce((sum, item) => sum + item.amount, 0),
      currency: paymentIntent.currency,
      platformCut: applicationFee,
      stripeCut: stripeFee,
      stripeId: paymentIntent.id,
      ...withPlatformCurrency(platformCurrencyValue),
      paymentStatus: "COMPLETED",
    },
  });

  let artist: Prisma.ProfileGetPayload<{ include: { user: true } }> | undefined;

  for (const item of merchItems) {
    const merch = await prisma.merch.findFirst({
      where: { id: item.id },
      include: { profile: { include: { user: true } } },
    });

    if (!merch) {
      logger.warn(`handleMerchPurchasesFromIntent: merch ${item.id} not found`);
      continue;
    }

    if (!artist && merch.profile) {
      artist = merch.profile;
    }

    const quantity = item.quantity ?? 1;

    await prisma.merchPurchase.create({
      data: {
        userId,
        merchId: merch.id,
        transactionId: transaction.id,
        fulfillmentStatus: "NO_PROGRESS",
        quantity,
        ...(item.optionIds?.length && {
          options: { connect: item.optionIds.map((id) => ({ id })) },
        }),
        ...(paymentIntent.shipping && {
          shippingAddress: {
            name: paymentIntent.shipping.name,
            address: paymentIntent.shipping.address,
          },
        }),
      },
    });

    if (merch.includePurchaseTrackGroupId) {
      try {
        await prisma.userTrackGroupPurchase.create({
          data: {
            trackGroupId: merch.includePurchaseTrackGroupId,
            userId,
            proGratis: true,
          },
        });
      } catch (e: any) {
        if (
          e instanceof PrismaClientKnownRequestError ||
          e?.name === "PrismaClientKnownRequestError"
        ) {
          if (e.code !== "P2002") {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }

    await decrementMerchStock(merch.id, item.optionIds ?? [], quantity);

    logger.info(
      `handleMerchPurchasesFromIntent: created purchase for merch ${merch.id}, userId ${userId}`
    );
  }

  const purchaser = await prisma.user.findFirst({ where: { id: userId } });

  if (purchaser && artist) {
    await sendSaleEmails(
      artist,
      purchaser,
      [transaction.id],
      paymentIntent.metadata?.message
    );
  }
};

export const completePurchaseFromIntent = async (
  intent: Stripe.PaymentIntent,
  accountId: string
) => {
  const metadata = (intent.metadata ?? {}) as unknown as SessionMetaData & {
    items?: string;
  };
  const { purchaseType, userId, userEmail, trackGroupId, trackId, artistId } =
    metadata;

  const sessionAdapter = {
    id: intent.id,
    amount_total: intent.amount_received,
    currency: intent.currency,
    metadata: { ...metadata, stripeAccountId: accountId },
    payment_intent: intent.id,
  } as unknown as Stripe.Checkout.Session;

  const { userId: actualUserId, newUser } = await findOrCreateUserBasedOnEmail(
    userEmail ?? "",
    userId
  );

  const platformCurrencyValue = await getPlatformCurrencyValueFromIntent(
    intent,
    accountId
  );

  if (purchaseType === "trackGroup" && trackGroupId) {
    await handleTrackGroupPurchase(
      Number(actualUserId),
      Number(trackGroupId),
      sessionAdapter,
      newUser,
      platformCurrencyValue
    );
  } else if (purchaseType === "track" && trackId) {
    await handleTrackPurchase(
      Number(actualUserId),
      Number(trackId),
      sessionAdapter,
      platformCurrencyValue
    );
  } else if (purchaseType === "tip" && artistId) {
    await handleArtistGift(
      Number(actualUserId),
      Number(artistId),
      sessionAdapter,
      platformCurrencyValue
    );
  } else if (purchaseType === "merch" && metadata.items) {
    await handleMerchPurchasesFromIntent(
      Number(actualUserId),
      JSON.parse(metadata.items),
      intent,
      accountId,
      platformCurrencyValue
    );
  }
};

export const handlePaymentIntentSucceeded = async (
  intent: Stripe.PaymentIntent,
  accountId: string
) => {
  logger.info(`payment_intent.succeeded: ${intent.id}`);

  intent.metadata = intent.metadata || {};

  const metadata = intent.metadata as unknown as SessionMetaData;
  const { purchaseType, transactionId } = metadata;

  if (intent.status !== "succeeded") return;

  if (purchaseType === "fundraiserPledge" && transactionId) {
    await handleFundraiserPledgePaymentSuccess(transactionId);
    return;
  }

  if (intent.invoice) {
    // handleInvoicePaid webhook already tackles this for subscriptions
    logger.info(
      `payment_intent.succeeded: ${intent.id} belongs to invoice ${intent.invoice}, already handled via invoice.paid`
    );
    return;
  }

  if (
    purchaseType !== "trackGroup" &&
    purchaseType !== "track" &&
    purchaseType !== "tip" &&
    purchaseType !== "merch"
  ) {
    logger.info(
      `payment_intent.succeeded: ${intent.id} has no recognized one-time purchaseType (got "${purchaseType}"), skipping`
    );
    return;
  }

  await completePurchaseFromIntent(intent, accountId);
};

export const handleAccountUpdate = async (account: Stripe.Account) => {
  try {
    const stripeAccount = await stripe.accounts.retrieve(account.id);
    const user = await prisma.user.findFirst({
      where: {
        stripeAccountId: account.id,
      },
    });
    if (user && stripeAccount.default_currency && !user.currency) {
      updateCurrencies(user.id, stripeAccount.default_currency);
    }
  } catch (e: any) {
    if (e?.code === "account_invalid" || e?.type === "StripePermissionError") {
      logger.warn(
        `Stripe permission error retrieving account '${account.id}': The API key may not have access to this account or the account may have been deleted.`
      );
    } else {
      logger.error(
        `Error retrieving Stripe account information for account '${account.id}'`,
        e
      );
    }
  }
  logger.info(`account.update: received update for ${account.id}`);
};

export default stripe;
