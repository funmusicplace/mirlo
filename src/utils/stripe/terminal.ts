import Stripe from "stripe";

import { logger } from "../../logger";

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
  profileId,
  stripeAccountId,
  amount,
  currency,
  userEmail,
  userId,
}: {
  readerId: string;
  tierId: number;
  profileId: number;
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
        artistId: String(profileId),
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
export const handleTerminalReaderActionSucceeded = async (
  reader: Stripe.Terminal.Reader,
  accountId: string
) => {
  logger.info(`terminal.reader.action_succeeded: reader ${reader.id}`);
  try {
    const action = reader.action;
    if (!action) return;

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

    await captureTerminalPaymentIntent({
      paymentIntentId,
      stripeAccountId: accountId,
    });
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
