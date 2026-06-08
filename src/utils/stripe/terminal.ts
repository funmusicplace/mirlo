import prisma from "@mirlo/prisma";
import Stripe from "stripe";

import { logger } from "../../logger";
import {
  handleTrackGroupPurchase,
  handleArtistGift,
} from "../handleFinishedTransactions";
import { registerSubscription } from "../subscriptionTier";
import { findOrCreateUserBasedOnEmail } from "../user";

import { getCurrency } from "./sessions";

import { stripe } from "./index";

export const createTerminalPaymentIntent = async ({
  totalAmount,
  currency,
  stripeAccountId,
  applicationFeeAmount,
  metadata,
}: {
  totalAmount: number;
  currency: string;
  stripeAccountId: string;
  applicationFeeAmount: number;
  metadata: Record<string, string>;
}) => {
  return stripe.paymentIntents.create(
    {
      amount: totalAmount,
      currency,
      payment_method_types: ["card_present"],
      capture_method: "manual",
      ...(applicationFeeAmount > 0 && {
        application_fee_amount: applicationFeeAmount,
      }),
      metadata,
    },
    { stripeAccount: stripeAccountId }
  );
};

export const processPaymentOnReader = async ({
  readerId,
  paymentIntentId,
  stripeAccountId,
}: {
  readerId: string;
  paymentIntentId: string;
  stripeAccountId: string;
}) => {
  return stripe.terminal.readers.processPaymentIntent(
    readerId,
    { payment_intent: paymentIntentId },
    { stripeAccount: stripeAccountId }
  );
};

export const captureTerminalPaymentIntent = async ({
  paymentIntentId,
  stripeAccountId,
}: {
  paymentIntentId: string;
  stripeAccountId: string;
}) => {
  return stripe.paymentIntents.capture(
    paymentIntentId,
    {},
    { stripeAccount: stripeAccountId }
  );
};

export const getTerminalPaymentStatus = async ({
  paymentIntentId,
  stripeAccountId,
}: {
  paymentIntentId: string;
  stripeAccountId: string;
}) => {
  return stripe.paymentIntents.retrieve(
    paymentIntentId,
    {},
    { stripeAccount: stripeAccountId }
  );
};

export const processSetupIntentOnReader = async ({
  readerId,
  setupIntentId,
  stripeAccountId,
}: {
  readerId: string;
  setupIntentId: string;
  stripeAccountId: string;
}) => {
  return stripe.terminal.readers.processSetupIntent(
    readerId,
    {
      setup_intent: setupIntentId,
      customer_consent_collected: true,
      // allow_redisplay is required by the Stripe API spec for process_setup_intent
      process_config: { allow_redisplay: "always" } as any,
    },
    { stripeAccount: stripeAccountId }
  );
};

export const createAndDispatchTerminalSetupIntent = async ({
  readerId,
  tierId,
  artistId,
  stripeAccountId,
  amount,
  currency,
  userEmail,
  userId,
}: {
  readerId: string;
  tierId: number;
  artistId: number;
  stripeAccountId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userId?: string;
}): Promise<{ setupIntentId: string }> => {
  const setupIntent = await stripe.setupIntents.create(
    {
      payment_method_types: ["card_present"],
      usage: "off_session",
      metadata: {
        tierId: String(tierId),
        artistId: String(artistId),
        stripeAccountId,
        amount: String(amount),
        currency,
        userEmail,
        ...(userId && { userId }),
      },
    },
    { stripeAccount: stripeAccountId }
  );

  await processSetupIntentOnReader({
    readerId,
    setupIntentId: setupIntent.id,
    stripeAccountId,
  });

  return { setupIntentId: setupIntent.id };
};

// Called from the terminal.reader.action_succeeded webhook.
// Routes to the appropriate post-purchase handler based on action type.
export const handleTerminalReaderActionSucceeded = async (
  reader: Stripe.Terminal.Reader,
  accountId: string
) => {
  logger.info(`terminal.reader.action_succeeded: reader ${reader.id}`);
  try {
    const action = reader.action;
    if (!action) return;

    if (action.type === "process_setup_intent") {
      await handleTerminalSetupIntentSucceeded(reader, accountId);
      return;
    }

    if (action.type !== "process_payment_intent") {
      return;
    }

    const rawIntent = action.process_payment_intent?.payment_intent;
    const paymentIntentId =
      typeof rawIntent === "string" ? rawIntent : rawIntent?.id;

    if (!paymentIntentId) {
      logger.warn(
        `terminal.reader.action_succeeded: no payment_intent on reader ${reader.id}`
      );
      return;
    }

    const paymentIntent = await captureTerminalPaymentIntent({
      paymentIntentId,
      stripeAccountId: accountId,
    });

    const metadata = paymentIntent.metadata as {
      purchaseType: "trackGroup" | "merch" | "tip";
      stripeAccountId: string;
      userId?: string;
      userEmail?: string;
      artistId?: string;
      trackGroupId?: string;
      message?: string;
      items?: string;
    };

    const { userId: actualUserId } = await findOrCreateUserBasedOnEmail(
      metadata.userEmail ?? "",
      metadata.userId
    );

    // Adapt the captured PaymentIntent into the shape the existing handlers
    // expect. All handlers use optional chaining so missing session fields
    // fall back to sensible defaults.
    const sessionAdapter = {
      id: paymentIntent.id,
      amount_total: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      metadata: {
        ...metadata,
        stripeAccountId: accountId,
      },
      payment_intent: paymentIntent.id,
    } as unknown as Stripe.Checkout.Session;

    if (metadata.purchaseType === "trackGroup" && metadata.trackGroupId) {
      await handleTrackGroupPurchase(
        Number(actualUserId),
        Number(metadata.trackGroupId),
        sessionAdapter
      );
    } else if (metadata.purchaseType === "tip" && metadata.artistId) {
      await handleArtistGift(
        Number(actualUserId),
        Number(metadata.artistId),
        sessionAdapter
      );
    } else if (metadata.purchaseType === "merch" && metadata.items) {
      await handleTerminalMerchPurchases(
        Number(actualUserId),
        JSON.parse(metadata.items),
        paymentIntent,
        accountId
      );
    }
  } catch (e) {
    logger.error(`handleTerminalReaderActionSucceeded: ${e}`);
    console.error(e);
  }
};

export const handleTerminalReaderActionFailed = (
  reader: Stripe.Terminal.Reader
) => {
  logger.warn(
    `terminal.reader.action_failed: reader ${reader.id}, failure: ${reader.action?.failure_message ?? "unknown"}`
  );
};

// Handles subscription sign-up via terminal SetupIntent.
// Creates/finds the customer, creates the Stripe Subscription, and records it in DB.
const handleTerminalSetupIntentSucceeded = async (
  reader: Stripe.Terminal.Reader,
  stripeAccountId: string
) => {
  const rawSetupIntent = reader.action?.process_setup_intent?.setup_intent;
  const setupIntentId =
    typeof rawSetupIntent === "string" ? rawSetupIntent : rawSetupIntent?.id;

  if (!setupIntentId) {
    logger.warn(
      `handleTerminalSetupIntentSucceeded: no setup_intent on reader ${reader.id}`
    );
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(
    setupIntentId,
    {},
    { stripeAccount: stripeAccountId }
  );

  const metadata = setupIntent.metadata as {
    tierId: string;
    userId?: string;
    userEmail?: string;
    amount: string;
  };

  const { userId: actualUserId, user } = await findOrCreateUserBasedOnEmail(
    metadata.userEmail ?? "",
    metadata.userId
  );

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (!paymentMethodId) {
    logger.error(
      `handleTerminalSetupIntentSucceeded: no payment method on setup intent ${setupIntentId}`
    );
    return;
  }

  const tier = await prisma.artistSubscriptionTier.findFirst({
    where: { id: Number(metadata.tierId), deletedAt: null },
    include: { artist: { select: { id: true } } },
  });

  if (!tier) {
    logger.error(
      `handleTerminalSetupIntentSucceeded: tier ${metadata.tierId} not found`
    );
    return;
  }

  const amount = Number(metadata.amount);
  const currency = await getCurrency(tier.artist.id, stripeAccountId);

  // Get or create a Stripe customer on the connected account for recurring billing
  let customerId: string;
  const existingCustomers = await stripe.customers.list(
    { email: user?.email ?? "" },
    { stripeAccount: stripeAccountId }
  );

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create(
      { email: user?.email ?? "" },
      { stripeAccount: stripeAccountId }
    );
    customerId = customer.id;
  }

  await stripe.paymentMethods.attach(
    paymentMethodId,
    { customer: customerId },
    { stripeAccount: stripeAccountId }
  );

  const platformPercent = tier.platformPercent ?? 7;

  // Ensure a Stripe product exists for this tier so price_data.product can be set.
  let productKey = tier.stripeProductKey;
  if (!productKey) {
    const product = await stripe.products.create(
      { name: tier.name, metadata: { tierId: String(tier.id) } },
      { stripeAccount: stripeAccountId }
    );
    productKey = product.id;
    await prisma.artistSubscriptionTier.update({
      where: { id: tier.id },
      data: { stripeProductKey: productKey },
    });
  }

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
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
        userId: String(actualUserId),
        stripeAccountId,
        purchaseType: "subscription",
      },
    },
    { stripeAccount: stripeAccountId }
  );

  await registerSubscription({
    userId: Number(actualUserId),
    tierId: tier.id,
    amount,
    paymentProcessorKey: subscription.id,
    platformCut: Math.round((amount * platformPercent) / 100),
    shippingAddress: null,
  });

  logger.info(
    `handleTerminalSetupIntentSucceeded: created subscription ${subscription.id} for user ${actualUserId}, tier ${tier.id}`
  );
};

type TerminalMerchItem = {
  type: "merch";
  id: string;
  quantity: number;
  amount: number;
};

// Handles merch post-purchase for terminal payments. Unlike the online checkout
// path, terminal payments have no line_items so we work from metadata directly.
const handleTerminalMerchPurchases = async (
  userId: number,
  items: TerminalMerchItem[],
  paymentIntent: Stripe.PaymentIntent,
  stripeAccountId: string
) => {
  let applicationFee = paymentIntent.application_fee_amount ?? 0;
  let stripeFee = 0;

  try {
    const chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    if (chargeId) {
      const charge = await stripe.charges.retrieve(
        chargeId,
        { expand: ["balance_transaction"] },
        { stripeAccount: stripeAccountId }
      );
      const bt = charge.balance_transaction as
        | Stripe.BalanceTransaction
        | undefined;
      stripeFee =
        bt?.fee_details.find((f) => f.type === "stripe_fee")?.amount ?? 0;
    }
  } catch (e) {
    logger.warn(`handleTerminalMerchPurchases: could not retrieve fees: ${e}`);
  }

  for (const item of items) {
    if (item.type !== "merch") continue;

    const merch = await prisma.merch.findFirst({
      where: { id: item.id },
    });

    if (!merch) {
      logger.warn(`handleTerminalMerchPurchases: merch ${item.id} not found`);
      continue;
    }

    const transaction = await prisma.userTransaction.create({
      data: {
        userId,
        amount: item.amount,
        currency: paymentIntent.currency,
        platformCut: applicationFee,
        stripeCut: stripeFee,
        stripeId: paymentIntent.id,
        paymentStatus: "COMPLETED",
      },
    });

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
      `handleTerminalMerchPurchases: created purchase for merch ${merch.id}, userId ${userId}`
    );
  }
};
