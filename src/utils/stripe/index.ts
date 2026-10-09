import prisma, { SafeUser } from "@mirlo/prisma";
import {
  Prisma,
  FundraiserPledge,
  Fundraiser,
  TrackGroup,
} from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { compact, uniq } from "lodash";
import Stripe from "stripe";

import { logger } from "../../logger";
import { subscribeUserToProfile } from "../artist";
import { AppError } from "../error";
import { getClient } from "../getClient";
import {
  handleFundraiserPledge,
  handleFundraiserPledgePaymentFailure,
  handleFundraiserPledgePaymentSuccess,
  completePurchase,
} from "../handleFinishedTransactions";
import { merchImageUrl } from "../merch";
import { recordPaymentAccountStatus } from "../paymentAccountStatus";
import { completeCheckout } from "../payments/checkout";
import {
  calculateAppFee,
  calculatePlatformPercent,
} from "../processingPayments";
import { manageSubscriptionReceipt } from "../subscription";
import { registerSubscription } from "../subscriptionTier";
import { createOrUpdatePledge } from "../trackGroup";
import { findOrCreateUserBasedOnEmail, updateCurrencies } from "../user";

import {
  completedPaymentFromIntent,
  getFeesFromPaymentIntent,
  getPlatformCurrencyValueFromIntent,
} from "./completedPayment";

export const OPTION_JOINER = ";;";

export const STRIPE_API_VERSION = "2023-08-16";

let stripeConfig: Stripe.StripeConfig = { apiVersion: STRIPE_API_VERSION };

if (process.env.NODE_ENV === "test") {
  const { STRIPE_HOST, STRIPE_PORT, STRIPE_PROTOCOL } = process.env;
  stripeConfig = {
    ...stripeConfig,
    host: STRIPE_HOST,
    port: STRIPE_PORT,
    protocol: STRIPE_PROTOCOL === "http" ? "http" : "https",
  };
}

const envStripeKey = () => process.env.STRIPE_KEY ?? "";
const envWebhookConnectSigningSecret = () =>
  process.env.STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET ?? "";

let stripeClient = new Stripe(envStripeKey(), stripeConfig);
let webhookConnectSigningSecret = envWebhookConnectSigningSecret();

type StripeSettings = {
  stripe?: { key?: string; webhookConnectSigningSecret?: string };
} | null;

/**
 * Update the stripe key or signing secret after the user updates it.
 */
export const refreshStripeClient = async (): Promise<string> => {
  try {
    const row = await prisma.settings.findFirst();
    const dbStripe = (row?.settings as StripeSettings)?.stripe;
    const apiKey =
      dbStripe?.key && dbStripe.key.trim() ? dbStripe.key : envStripeKey();
    webhookConnectSigningSecret =
      dbStripe?.webhookConnectSigningSecret &&
      dbStripe.webhookConnectSigningSecret.trim()
        ? dbStripe.webhookConnectSigningSecret
        : envWebhookConnectSigningSecret();
    stripeClient = new Stripe(apiKey, stripeConfig);
    return apiKey;
  } catch (e) {
    logger.error(`refreshStripeClient: failed to load key from settings`, e);
    webhookConnectSigningSecret = envWebhookConnectSigningSecret();
    return envStripeKey();
  }
};

export const getStripeWebhookConnectSigningSecret = () =>
  webhookConnectSigningSecret;

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
    include: { profile: true; images: { include: { image: true } } };
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
      images: compact([merchImageUrl(merch.images?.[0], 600)]),
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
  checkoutId?: string;
  purchaseType:
    | "trackGroup"
    | "subscription"
    | "merch"
    | "tip"
    | "track"
    | "catalogue"
    | "fundraiserPledge";
};

const recoverEmailFromSetupIntent = async (
  intent: Stripe.SetupIntent,
  accountId: string
): Promise<string> => {
  const paymentMethod =
    typeof intent.payment_method === "string"
      ? await stripe.paymentMethods.retrieve(
          intent.payment_method,
          {},
          { stripeAccount: accountId }
        )
      : intent.payment_method;

  return paymentMethod?.billing_details?.email ?? "";
};

export const handleSetupIntentSucceeded = async (
  setupIntent: Stripe.SetupIntent
) => {
  logger.info(`setup_intent.succeeded: ${setupIntent.id}`);
  const intent = await stripe.setupIntents.retrieve(
    setupIntent.id,
    { expand: ["latest_attempt"] },
    { stripeAccount: setupIntent.metadata?.stripeAccountId }
  );

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
    checkoutId?: string;
  };

  if (metadata.subscriptionKey) {
    await handleSubscriptionPaymentMethodUpdateSucceeded(
      intent,
      metadata.subscriptionKey,
      metadata.stripeAccountId
    );
    return;
  }

  const { fundraiserId, userId, userName } = metadata;

  let userEmail = metadata.userEmail ?? "";
  if (!userEmail && !userId) {
    userEmail = await recoverEmailFromSetupIntent(
      intent,
      metadata.stripeAccountId
    );
    if (userEmail) {
      logger.warn(
        `handleSetupIntentSucceeded: ${intent.id} carried no identity in its metadata; recovered the buyer's email from the payment method's billing details`
      );
    }
  }

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
      await subscribeUserToProfile(fundraiser.trackGroups[0].profile, user);
    }
  } else if (metadata.tierId) {
    const {
      tierId,
      amount,
      currency,
      stripeAccountId,
      oldStripeSubscriptionKey,
    } = metadata;

    // card_present payment methods are single-use and can't be saved to a
    // customer; recurring billing must use the reusable `card` payment method
    // Stripe generates from the card_present setup.
    const latestAttempt =
      typeof intent.latest_attempt === "string" ? null : intent.latest_attempt;
    const generatedCard =
      latestAttempt?.payment_method_details?.card_present?.generated_card;
    const paymentMethod = generatedCard ?? intent.payment_method;
    const paymentMethodId =
      typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id;

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
      oldStripeSubscriptionKey,
      shippingAddress,
    });
  }

  await completeCheckout(metadata.checkoutId);
};

/**
 * PaymentIntent ids are prefixed `pi_`, SetupIntent ids `seti_`.
 */
export const isSetupIntentId = (id: string) => id.startsWith("seti_");

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

  const existingPaidSubscriptions =
    await prisma.profileUserSubscription.findMany({
      where: {
        userId,
        deletedAt: null,
        stripeSubscriptionKey: { not: null },
        profileSubscriptionTier: { profileId: tier.profileId },
      },
      select: { stripeSubscriptionKey: true },
    });

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

  const oldStripeSubscriptionKeys = uniq(
    [
      oldStripeSubscriptionKey,
      ...existingPaidSubscriptions.map((sub) => sub.stripeSubscriptionKey),
    ].filter((key): key is string => !!key && key !== subscription.id)
  );

  for (const oldKey of oldStripeSubscriptionKeys) {
    try {
      await stripe.subscriptions.cancel(oldKey, {
        stripeAccount: stripeAccountId,
      });
    } catch (e) {
      logger.error(
        `finalizeSubscriptionSetup: failed to cancel old subscription ${oldKey}`,
        e
      );
    }
  }

  // The new tier's row is now the user's only subscription to this artist.
  const oldTierSubscriptionsWhere = {
    userId,
    profileSubscriptionTierId: { not: tier.id },
    profileSubscriptionTier: { profileId: tier.profileId },
  };
  await prisma.profileUserSubscription.updateMany({
    where: oldTierSubscriptionsWhere,
    data: { deleteReason: "TIER_SWITCHED" },
  });
  await prisma.profileUserSubscription.deleteMany({
    where: oldTierSubscriptionsWhere,
  });

  logger.info(
    `finalizeSubscriptionSetup: created subscription ${subscription.id} for user ${userId}, tier ${tier.id}`
  );
};

export const chargePledgePayments = async (
  pledge: FundraiserPledge & { user: SafeUser } & {
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
        // The charge confirms immediately, so its webhook can arrive before
        // create() returns. The transaction has to exist first.
        const transaction = await handleFundraiserPledge(pledge, currency);
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: pledge.amount,
            currency: currency,
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: { enabled: true },
            customer: customerId,
            payment_method: paymentMethods.data[0]?.id,
            return_url: encodeURI(
              `${client.applicationUrl}/${pledge.fundraiser.trackGroups[0].profile.urlSlug}/release/${pledge.fundraiser.trackGroups[0].urlSlug}`
            ),
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
              transactionId: transaction.id,
            },
          },
          {
            stripeAccount: stripeAccountId,
          }
        );
        logger.info(
          `Created payment intent ${paymentIntent.id} for pledge ${pledge.id}`
        );

        await prisma.userTransaction.update({
          where: { id: transaction.id },
          data: { stripeId: paymentIntent.id },
        });
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
    const { paymentProcessorFee, intent } = await getFeeDetailsFromInvoice(
      invoice,
      accountId
    );
    const platformCurrencyValue = await getPlatformCurrencyValueFromIntent(
      intent,
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
      platformCurrencyValue,
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

/**
 * Last-resort buyer email, read back from what Stripe itself collected. Only
 * used when an intent reaches us with no identity in its metadata at all: the
 * charge has already gone through by then, so resolving nothing here would
 * mean a real payment that Mirlo has no record of.
 */
const recoverEmailFromIntent = async (
  intent: Stripe.PaymentIntent,
  accountId: string
): Promise<string> => {
  if (intent.receipt_email) {
    return intent.receipt_email;
  }

  const charge =
    typeof intent.latest_charge === "string"
      ? await stripe.charges.retrieve(
          intent.latest_charge,
          {},
          { stripeAccount: accountId }
        )
      : intent.latest_charge;

  return charge?.billing_details?.email ?? "";
};

export const completePurchaseFromIntent = async (
  intent: Stripe.PaymentIntent,
  accountId: string
) => {
  const metadata = (intent.metadata ?? {}) as unknown as SessionMetaData & {
    items?: string;
  };
  const { userId, userEmail } = metadata;

  let resolvedEmail = userEmail ?? "";
  if (!resolvedEmail && !userId) {
    resolvedEmail = await recoverEmailFromIntent(intent, accountId);
    if (resolvedEmail) {
      logger.warn(
        `completePurchaseFromIntent: ${intent.id} carried no identity in its metadata; recovered the buyer's email from Stripe's billing details`
      );
    }
  }

  const { userId: actualUserId, newUser } = await findOrCreateUserBasedOnEmail(
    resolvedEmail,
    userId
  );

  const payment = await completedPaymentFromIntent(intent, accountId);

  await completePurchase(
    Number(actualUserId),
    JSON.parse(metadata.items ?? "[]"),
    payment,
    { newUser }
  );
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
    purchaseType !== "merch" &&
    purchaseType !== "catalogue"
  ) {
    logger.info(
      `payment_intent.succeeded: ${intent.id} has no recognized one-time purchaseType (got "${purchaseType}"), skipping`
    );
    return;
  }

  await completePurchaseFromIntent(intent, accountId);
  await completeCheckout(metadata.checkoutId);
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
    if (user) {
      try {
        await recordPaymentAccountStatus(
          user.id,
          !!stripeAccount.charges_enabled
        );
      } catch (e) {
        logger.error(
          `account.update: could not record payment account status for user ${user.id}`,
          e
        );
      }
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
