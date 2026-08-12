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

// The runtime stripe key is held in the admin Settings row so self-hosters
// can rotate it without redeploying (#1147). Falls back to STRIPE_KEY env so
// existing deployments keep working before any admin saves a value
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

// Shared find-or-create core for the four createXStripeProduct functions
// below: checkForProductKey (unchanged), then — if nothing was found — create
// the Stripe Product and hand its id to persistProductKey. Each entity type
// differs only in its create params and how (or whether) it persists the
// resulting key, so those are the only things callers provide.
const createOrReuseStripeProduct = async ({
  existingProductKey,
  stripeAccountId,
  searchOptions,
  buildCreateParams,
  persistProductKey,
}: {
  existingProductKey: string | null;
  stripeAccountId: string;
  /** Only merch products are looked up by an option-combination search — see checkForProductKey. */
  searchOptions?: { merchOptionIds?: string[] };
  buildCreateParams: () => Promise<Stripe.ProductCreateParams>;
  /** Omit to skip persisting — merch with options doesn't store a single stripeProductKey on the row (see createMerchStripeProduct). */
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

  // Stripe's customers.list ignores a missing/blank `email` filter and just
  // returns the connected account's customers unfiltered (most recent first)
  // — that would hand back some unrelated buyer's Customer object here rather
  // than "no match", so a real customer never gets attached to it.
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

    // If the user doesn't exist, we create one with an existing userEmail.
    // `userName` is the buyer's self-chosen display name (subscriptions only);
    // we deliberately do NOT fall back to Stripe's billing name — a blank field
    // means the supporter chose not to share a display name.
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
    /** Set only on a payment-method-update SetupIntent (see createSubscriptionPaymentMethodSetup) — presence alone routes to that branch, same as fundraiserId/tierId below. */
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
    /** The Stripe subscription this new one supersedes, if any — cancelled directly once the new one is confirmed. */
    oldStripeSubscriptionKey?: string;
    /** JSON-stringified `{ name?, address }`, set via `PUT /v1/purchase/:id` before confirmation — see attachSetupIntentShippingAddress. */
    shippingAddress?: string;
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
 * SetupIntent's metadata, so `handleSetupIntentSucceeded` can read it back
 * once the SetupIntent succeeds and pass it to `finalizeSubscriptionSetup`.
 * SetupIntents (unlike PaymentIntents) have no native `shipping` field —
 * confirmSetup can't carry it the way confirmPayment does — so this is the
 * mechanism for a `collectAddress` tier's address to survive to registration.
 * Called from `PUT /v1/purchase/:id`, before the frontend calls confirmSetup.
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
 * Attaches the buyer's identity to a not-yet-confirmed PaymentIntent/SetupIntent
 * before the frontend confirms it — for a hosted-checkout purchase that was
 * initiated without a known user (an external caller that didn't collect an
 * email up front). `handleSetupIntentSucceeded`/`completePurchaseFromIntent`
 * read `userId`/`userEmail` back off the intent's metadata once it succeeds,
 * so without this step the resulting purchase/subscription has no buyer to
 * register against. Called from `PUT /v1/purchase/:id`, before the frontend
 * calls confirmPayment/confirmSetup. Stripe merges metadata updates, so this
 * never clobbers the other keys (tierId, artistId, …) set at creation.
 */
export const attachIntentIdentity = async ({
  id,
  stripeAccountId,
  userId,
  userEmail,
}: {
  id: string;
  stripeAccountId: string;
  /** Set when the buyer is logged in to Mirlo — takes precedence over any email the caller typed in. */
  userId?: number;
  userEmail: string;
}) => {
  const metadata: Record<string, string> = {
    userEmail,
    ...(userId !== undefined && { userId: String(userId) }),
  };

  if (id.startsWith("seti_")) {
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
 * Applies a confirmed payment-method-update SetupIntent to the subscription
 * it was created for — the SetupIntent's `customer` was set at creation
 * (`createSubscriptionPaymentMethodSetup`), so Stripe already attached the
 * resulting payment method to that customer; this only needs to point the
 * subscription's `default_payment_method` at it. Nothing else about the
 * subscription (tier, amount, DB row) changes.
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
 * Creates a Stripe Customer (or reuses one), attaches the given payment
 * method, creates the recurring Stripe Subscription for a tier, and registers
 * it in the DB. Shared by the online (`setup_intent.succeeded`) and terminal
 * (`terminal.reader.action_succeeded`) subscription paths — the only
 * difference between them is how the payment method id was obtained (a
 * card-present setup generates a reusable card via `latest_attempt`; an
 * online setup intent already has `payment_method` set directly).
 *
 * When `oldStripeSubscriptionKey` is present (a fresh SetupIntent was needed
 * instead of the in-place-repricing fast path — whether switching tiers or
 * re-authorising the same one), the subscription it names is only cancelled
 * here — after the new one is confirmed active — never before.
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
  /** The Stripe subscription this new one supersedes, if any (same tier or a different one). */
  oldStripeSubscriptionKey?: string;
  /** Collected via the tier's AddressElement when `tier.collectAddress` is set — see attachSetupIntentShippingAddress. */
  shippingAddress?: { name?: string; address: Record<string, unknown> } | null;
}) => {
  // Independent lookups: which tier, and which Stripe customer, don't depend
  // on each other.
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

  const platformPercent = await calculatePlatformPercent(
    currency || "usd",
    tier.platformPercent ?? tier.profile.defaultPlatformFee
  );

  // Also independent: attaching the payment method to the customer and
  // ensuring the tier's Stripe product exists don't depend on each other.
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

  // Cancel the specific old subscription this one supersedes, by id — never
  // by re-querying on tier, since a same-tier re-authorisation (e.g.
  // re-collecting a `collectAddress` tier's address) would otherwise match
  // the row `registerSubscription` just upserted above with the *new* key.
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
    // Different tier: its DB row is separate from the one just upserted
    // above for the new tier, so it needs its own cleanup.
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

  // Expanding latest_charge.balance_transaction here means
  // getFeesFromPaymentIntent reuses it directly instead of a second Stripe
  // round-trip to fetch the charge.
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

// Fires when Stripe ends a subscription — either because we scheduled it to
// cancel at period end (user cancellation, see subscribe.ts) or because Stripe
// exhausted its dunning retries after repeated payment failures. This is the
// single place we set `deletedAt`, so access (gated on `deletedAt: null`)
// continues through any paid-up period and is revoked exactly when Stripe
// considers the subscription over.
export const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription
) => {
  logger.info(`customer.subscription.deleted: ${subscription.id}`);

  // Honour any reason we recorded at cancellation time; only override it when
  // Stripe tells us the subscription died because billing ultimately failed.
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
    // User chose "stop payments but keep following": rather than removing
    // access, drop them onto the artist's free tier so they keep getting
    // posts/emails with no further billing. Doesn't apply to payment
    // failures — those aren't a user opting to keep following.
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

// Records merch purchases from a captured/succeeded PaymentIntent. Works for
// both terminal and online flows — it only reads from the PaymentIntent (fees,
// charge, currency) and the `items` carried in metadata.
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

  // One PaymentIntent is one payment, so it gets one transaction with the fees
  // recorded once. Each merch line item is attached to it as its own purchase.
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

    // Some merch items bundle a free album with the purchase. Swallow a
    // unique-constraint race (P2002) the same way the legacy Checkout Session
    // path does — a buyer who already owns the bonus album (e.g. bought it
    // directly, or bought two of this merch item) shouldn't fail the purchase.
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

// Dispatches a succeeded/captured PaymentIntent to the right post-purchase
// handler based on `purchaseType` metadata. Shared by the online
// (handlePaymentIntentSucceeded) and terminal (handleTerminalReaderActionSucceeded)
// flows so the routing lives in exactly one place.
export const completePurchaseFromIntent = async (
  intent: Stripe.PaymentIntent,
  accountId: string
) => {
  const metadata = (intent.metadata ?? {}) as unknown as SessionMetaData & {
    items?: string;
  };
  const { purchaseType, userId, userEmail, trackGroupId, trackId, artistId } =
    metadata;

  // Adapt the PaymentIntent into the shape the existing handlers expect. All
  // handlers use optional chaining so missing session fields fall back to
  // sensible defaults.
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

  // Freeze the transaction's value in the platform's currency (never throws;
  // falls back to nulls). Checkout Session path doesn't record this.
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
