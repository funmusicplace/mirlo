import prisma from "@mirlo/prisma";
import {
  Prisma,
  User,
  FundraiserPledge,
  Fundraiser,
  TrackGroup,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";
import Stripe from "stripe";

import { logger } from "../../logger";
import { subscribeUserToArtist } from "../artist";
import { AppError } from "../error";
import { getClient } from "../getClient";
import {
  getFeesFromPaymentIntent,
  handleArtistGift,
  handleArtistMerchPurchase,
  handleCataloguePurchase,
  handleFundraiserPledge,
  handleFundraiserPledgePaymentFailure,
  handleFundraiserPledgePaymentSuccess,
  handleSubscription,
  handleTrackGroupPurchase,
  handleTrackPurchase,
  sendSaleEmails,
} from "../handleFinishedTransactions";
import { generateFullStaticImageUrl } from "../images";
import { finalCoversBucket, finalMerchImageBucket } from "../minio";
import { calculateAppFee } from "../processingPayments";
import { manageSubscriptionReceipt } from "../subscription";
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
                  finalMerchImageBucket
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

  const existingCustomer = await stripe.customers.list(
    {
      email: searchEmail,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  if (existingCustomer.data.length > 0) {
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

  const fundraiserId = setupIntent.metadata?.fundraiserId;

  const { userId, userEmail } = setupIntent.metadata as unknown as {
    userId: string;
    userEmail: string;
  };

  let {
    userId: actualUserId,
    user,
    newUser,
  } = await findOrCreateUserBasedOnEmail(userEmail, userId);

  if (fundraiserId) {
    const fundraiser = await prisma.fundraiser.findUnique({
      where: {
        id: Number(fundraiserId),
      },
      include: {
        trackGroups: {
          include: {
            artist: {
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
      await subscribeUserToArtist(fundraiser.trackGroups[0].artist, user);
    }
  }
};

export const chargePledgePayments = async (
  pledge: FundraiserPledge & { user: User } & {
    fundraiser: Fundraiser & {
      trackGroups: (TrackGroup & {
        artist: { urlSlug: string; user: { stripeAccountId: string | null } };
      })[];
    };
  }
) => {
  const client = await getClient();

  if (!pledge.fundraiser.trackGroups[0].artist.user.stripeAccountId) {
    throw new AppError({
      description: "Artist does not have a connected stripe account",
      httpCode: 400,
    });
  }

  const stripeAccountId =
    pledge.fundraiser.trackGroups[0].artist.user.stripeAccountId;

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
            return_url: `${client.applicationUrl}/${pledge.fundraiser.trackGroups[0].artist.urlSlug}/release/${pledge.fundraiser.trackGroups[0].urlSlug}`,
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
      expand: ["latest_charge.balance_transaction.fee_details"],
    },
    { stripeAccount: accountId }
  );
  const feeDetails =
    intent.latest_charge &&
    typeof intent.latest_charge !== "string" &&
    intent.latest_charge.balance_transaction &&
    typeof intent.latest_charge.balance_transaction !== "string"
      ? intent.latest_charge.balance_transaction?.fee_details
      : undefined;
  const stripeFee = feeDetails?.find((fd) => fd.type === "stripe_fee");
  return { stripeFee, intent };
};

export const handleInvoicePaid = async (
  invoice: Stripe.Invoice,
  accountId: string
) => {
  const subscription = invoice.subscription;
  logger.info(`invoice.paid: ${invoice.id} for ${subscription}`);
  if (typeof subscription === "string") {
    const { stripeFee } = await getFeeDetailsFromInvoice(invoice, accountId);

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

    invoice.billing_reason === "subscription_create";

    await manageSubscriptionReceipt({
      processorPaymentReferenceId: invoice.id,
      processorSubscriptionReferenceId: subscription,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      platformCut: invoice.application_fee_amount || 0,
      paymentProcessorFee: stripeFee?.amount || 0,
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
    const { intent, stripeFee } = await getFeeDetailsFromInvoice(
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
      paymentProcessorFee: stripeFee?.amount || 0,
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

type MerchPurchaseItem = {
  type: "merch";
  id: string;
  quantity?: number;
  amount: number;
};

// Records merch purchases from a captured/succeeded PaymentIntent. Works for
// both terminal and online flows — it only reads from the PaymentIntent (fees,
// charge, currency) and the `items` carried in metadata.
export const handleMerchPurchasesFromIntent = async (
  userId: number,
  items: MerchPurchaseItem[],
  paymentIntent: Stripe.PaymentIntent,
  stripeAccountId: string
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
      paymentStatus: "COMPLETED",
    },
  });

  let artist: Prisma.ArtistGetPayload<{ include: { user: true } }> | undefined;

  for (const item of merchItems) {
    const merch = await prisma.merch.findFirst({
      where: { id: item.id },
      include: { artist: { include: { user: true } } },
    });

    if (!merch) {
      logger.warn(`handleMerchPurchasesFromIntent: merch ${item.id} not found`);
      continue;
    }

    if (!artist && merch.artist) {
      artist = merch.artist;
    }

    await prisma.merchPurchase.create({
      data: {
        userId,
        merchId: merch.id,
        transactionId: transaction.id,
        fulfillmentStatus: "NO_PROGRESS",
        quantity: item.quantity ?? 1,
      },
    });

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
  const { purchaseType, userId, userEmail, trackGroupId, artistId } = metadata;

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

  if (purchaseType === "trackGroup" && trackGroupId) {
    await handleTrackGroupPurchase(
      Number(actualUserId),
      Number(trackGroupId),
      sessionAdapter,
      newUser
    );
  } else if (purchaseType === "tip" && artistId) {
    await handleArtistGift(
      Number(actualUserId),
      Number(artistId),
      sessionAdapter
    );
  } else if (purchaseType === "merch" && metadata.items) {
    await handleMerchPurchasesFromIntent(
      Number(actualUserId),
      JSON.parse(metadata.items),
      intent,
      accountId
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
