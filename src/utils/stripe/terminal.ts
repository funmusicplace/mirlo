import Stripe from "stripe";

import { logger } from "../../logger";
import { findOrCreateUserBasedOnEmail } from "../user";

import {
  completePurchaseFromIntent,
  finalizeSubscriptionSetup,
  stripe,
} from "./index";

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

export const listTerminalReaders = async ({
  stripeAccountId,
}: {
  stripeAccountId: string;
}) => {
  const readers = await stripe.terminal.readers.list(
    { limit: 100 },
    { stripeAccount: stripeAccountId }
  );
  return readers.data;
};

export const cancelIntent = async ({
  id,
  stripeAccountId,
}: {
  id: string;
  stripeAccountId: string;
}) => {
  if (id.startsWith("seti_")) {
    return stripe.setupIntents.cancel(
      id,
      {},
      { stripeAccount: stripeAccountId }
    );
  }
  return stripe.paymentIntents.cancel(
    id,
    {},
    { stripeAccount: stripeAccountId }
  );
};

/**
 * Clears the reader's current action, but only if it is still working on the
 * given intent — cancelling blindly could kill a newer, unrelated sale that
 * has since been dispatched to the same reader.
 */
export const cancelReaderActionForIntent = async ({
  readerId,
  intentId,
  stripeAccountId,
}: {
  readerId: string;
  intentId: string;
  stripeAccountId: string;
}): Promise<boolean> => {
  const reader = await stripe.terminal.readers.retrieve(
    readerId,
    {},
    { stripeAccount: stripeAccountId }
  );

  if (reader.deleted) {
    return false;
  }

  const action = reader.action;
  if (action?.status !== "in_progress") {
    return false;
  }

  const rawIntent =
    action.type === "process_payment_intent"
      ? action.process_payment_intent?.payment_intent
      : action.type === "process_setup_intent"
        ? action.process_setup_intent?.setup_intent
        : undefined;
  const actionIntentId =
    typeof rawIntent === "string" ? rawIntent : rawIntent?.id;

  if (actionIntentId !== intentId) {
    return false;
  }

  await stripe.terminal.readers.cancelAction(readerId, {
    stripeAccount: stripeAccountId,
  });
  return true;
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
      // On the pinned Stripe apiVersion 2023-08-16, process_setup_intent takes
      // customer_consent_collected. allow_redisplay (which replaced it in later
      // versions) does not exist here and is rejected as an unknown parameter.
      customer_consent_collected: true,
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

  try {
    await processSetupIntentOnReader({
      readerId,
      setupIntentId: setupIntent.id,
      stripeAccountId,
    });
  } catch (e) {
    // Reader offline/busy — don't leave the intent dangling in
    // requires_payment_method.
    await cancelIntent({ id: setupIntent.id, stripeAccountId }).catch(() => {});
    throw e;
  }

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

    await completePurchaseFromIntent(paymentIntent, accountId);
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
    { expand: ["latest_attempt"] },
    { stripeAccount: stripeAccountId }
  );

  const metadata = setupIntent.metadata as {
    tierId: string;
    userId?: string;
    userEmail?: string;
    amount: string;
    currency: string;
  };

  const { userId: actualUserId, user } = await findOrCreateUserBasedOnEmail(
    metadata.userEmail ?? "",
    metadata.userId
  );

  // card_present payment methods are single-use and can't be saved to a
  // customer; recurring billing must use the reusable `card` payment method
  // Stripe generates from the card_present setup.
  const latestAttempt =
    typeof setupIntent.latest_attempt === "string"
      ? null
      : setupIntent.latest_attempt;
  const generatedCard =
    latestAttempt?.payment_method_details?.card_present?.generated_card;
  const paymentMethodId =
    typeof generatedCard === "string" ? generatedCard : generatedCard?.id;

  if (!paymentMethodId) {
    logger.error(
      `handleTerminalSetupIntentSucceeded: no generated card on setup intent ${setupIntentId}`
    );
    return;
  }

  await finalizeSubscriptionSetup({
    stripeAccountId,
    paymentMethodId,
    tierId: Number(metadata.tierId),
    amount: Number(metadata.amount),
    currency: metadata.currency,
    userId: Number(actualUserId),
    userEmail: user?.email,
  });
};
