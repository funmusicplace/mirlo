import Stripe from "stripe";

import { logger } from "../../logger";
import {
  CompletedPayment,
  EMPTY_PLATFORM_CURRENCY_VALUE,
  PlatformCurrencyValue,
} from "../payments/completedPayment";

import { stripe } from "./index";

export const getFeesFromPaymentIntent = async (
  paymentIntent: Stripe.PaymentIntent,
  stripeAccount: string
): Promise<{ applicationFee: number; paymentProcessorFee: number }> => {
  let balanceTransaction: Stripe.BalanceTransaction | undefined;

  if (
    paymentIntent.latest_charge &&
    typeof paymentIntent.latest_charge !== "string" &&
    paymentIntent.latest_charge.balance_transaction &&
    typeof paymentIntent.latest_charge.balance_transaction !== "string"
  ) {
    balanceTransaction = paymentIntent.latest_charge.balance_transaction;
  } else {
    const chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : (paymentIntent.latest_charge?.id ?? "");

    if (chargeId) {
      const charge = await stripe.charges.retrieve(
        chargeId,
        { expand: ["balance_transaction"] },
        { stripeAccount }
      );
      balanceTransaction = charge.balance_transaction as
        | Stripe.BalanceTransaction
        | undefined;
    }
  }

  const paymentProcessorFee =
    balanceTransaction?.fee_details.find((fee) => fee.type === "stripe_fee")
      ?.amount ?? 0;

  return {
    applicationFee: paymentIntent.application_fee_amount ?? 0,
    paymentProcessorFee,
  };
};

export const getPlatformCurrencyValueFromIntent = async (
  paymentIntent: Stripe.PaymentIntent,
  stripeAccount: string
): Promise<PlatformCurrencyValue> => {
  try {
    const chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : (paymentIntent.latest_charge?.id ?? "");
    if (!chargeId) return EMPTY_PLATFORM_CURRENCY_VALUE;

    // Charge is on the connected account; its application_fee id lives on the platform.
    const charge = await stripe.charges.retrieve(
      chargeId,
      {},
      { stripeAccount }
    );
    const applicationFeeId =
      typeof charge.application_fee === "string"
        ? charge.application_fee
        : (charge.application_fee?.id ?? "");
    if (!applicationFeeId) return EMPTY_PLATFORM_CURRENCY_VALUE;

    // No { stripeAccount }: application fees live on the platform account.
    const applicationFee = await stripe.applicationFees.retrieve(
      applicationFeeId,
      { expand: ["balance_transaction"] }
    );

    const balanceTransaction = applicationFee.balance_transaction;
    if (!balanceTransaction || typeof balanceTransaction === "string") {
      // Not yet settled — record nothing rather than a wrong figure.
      return EMPTY_PLATFORM_CURRENCY_VALUE;
    }

    // exchange_rate is null when presentment currency == platform currency (rate 1).
    const exchangeRate = balanceTransaction.exchange_rate ?? 1;
    const amount = paymentIntent.amount_received ?? paymentIntent.amount ?? 0;

    return {
      platformCurrencyAmount: Math.round(amount * exchangeRate),
      platformCurrency: balanceTransaction.currency,
      exchangeRate,
    };
  } catch (e) {
    logger.warn(
      `getPlatformCurrencyValueFromIntent: could not determine platform currency value for ${paymentIntent.id}: ${e}`
    );
    return EMPTY_PLATFORM_CURRENCY_VALUE;
  }
};

export const completedPaymentFromIntent = async (
  intent: Stripe.PaymentIntent,
  accountId: string,
  overrides: Partial<Pick<CompletedPayment, "id" | "amount">> = {}
): Promise<CompletedPayment> => {
  let platformCut = intent.application_fee_amount ?? 0;
  let processorFee = 0;
  try {
    ({ applicationFee: platformCut, paymentProcessorFee: processorFee } =
      await getFeesFromPaymentIntent(intent, accountId));
  } catch (e) {
    logger.error(
      `completedPaymentFromIntent: could not retrieve fees for ${intent.id}, recording purchase without fee details: ${e}`
    );
  }

  const platformCurrencyValue = await getPlatformCurrencyValueFromIntent(
    intent,
    accountId
  );

  logger.info(
    `completedPaymentFromIntent: ${intent.id} application fee: ${platformCut}, Stripe fee: ${processorFee}`
  );

  return {
    id: overrides.id ?? intent.id,
    amount: overrides.amount ?? intent.amount_received ?? 0,
    currency: intent.currency,
    metadata: { ...(intent.metadata ?? {}) },
    platformCut,
    processorFee,
    platformCurrencyValue,
    shippingAddress: intent.shipping
      ? { name: intent.shipping.name, address: intent.shipping.address }
      : null,
  };
};

/**
 * Legacy `checkout.session.completed` path. Nothing creates Checkout Sessions
 * any more, but sessions opened before the migration can still complete.
 */
export const completedPaymentFromSession = async (
  session: Stripe.Checkout.Session
): Promise<CompletedPayment> => {
  const fromSession: CompletedPayment = {
    id: session.id,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    metadata: { ...(session.metadata ?? {}) },
    platformCut: 0,
    processorFee: 0,
    platformCurrencyValue: EMPTY_PLATFORM_CURRENCY_VALUE,
    shippingAddress: session.shipping_details
      ? {
          name: session.shipping_details.name,
          address: session.shipping_details.address,
        }
      : null,
  };

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const stripeAccount = session.metadata?.stripeAccountId ?? null;

  if (!paymentIntentId) {
    logger.warn("No payment intent ID found in session metadata");
    return fromSession;
  }
  if (!stripeAccount) {
    logger.warn("No stripe account found in session metadata");
    return fromSession;
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount,
    });
    const fromIntent = await completedPaymentFromIntent(intent, stripeAccount, {
      id: fromSession.id,
      amount: fromSession.amount,
    });
    return {
      ...fromIntent,
      metadata: fromSession.metadata,
      shippingAddress: fromSession.shippingAddress,
    };
  } catch (error) {
    logger.error(
      `Error retrieving application fee for session ${session.id}, recording purchase without fee details:`,
      error
    );
    return fromSession;
  }
};
