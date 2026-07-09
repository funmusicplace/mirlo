// Stripe implementation of the PaymentProcessor interface. This is a thin
// adapter: it delegates to the existing Stripe primitives in src/utils/stripe/*
// and maps their Stripe-shaped returns onto the neutral interface shape. Keeping
// the SDK calls in src/utils/stripe/ (rather than moving them here) means the
// terminal webhook path and other callers that still use them directly are
// untouched by this scaffolding step.

import stripe, { createOnlinePaymentIntent } from "../stripe";
import { getIntentStatus } from "../stripe/status";
import {
  createTerminalPaymentIntent,
  processPaymentOnReader,
  createAndDispatchTerminalSetupIntent,
  cancelIntent,
  cancelReaderActionForIntent,
} from "../stripe/terminal";

import {
  PaymentProcessor,
  CreatePaymentArgs,
  CreateSubscriptionSetupArgs,
  PaymentStatusResult,
} from "./PaymentProcessor";

export class StripePaymentProcessor implements PaymentProcessor {
  async createOnlinePayment({
    amount,
    currency,
    accountId,
    applicationFeeAmount,
    metadata,
  }: CreatePaymentArgs): Promise<{ id: string; clientSecret: string | null }> {
    const paymentIntent = await createOnlinePaymentIntent({
      amount,
      currency,
      stripeAccountId: accountId,
      applicationFeeAmount,
      metadata,
    });
    return { id: paymentIntent.id, clientSecret: paymentIntent.client_secret };
  }

  async createTerminalPayment({
    amount,
    currency,
    accountId,
    applicationFeeAmount,
    metadata,
    readerId,
  }: CreatePaymentArgs & { readerId: string }): Promise<{ id: string }> {
    const paymentIntent = await createTerminalPaymentIntent({
      totalAmount: amount,
      currency,
      stripeAccountId: accountId,
      applicationFeeAmount,
      metadata,
    });
    try {
      await processPaymentOnReader({
        readerId,
        paymentIntentId: paymentIntent.id,
        stripeAccountId: accountId,
      });
    } catch (e) {
      // Reader offline/busy — don't leave the intent dangling in
      // requires_payment_method.
      await cancelIntent({
        id: paymentIntent.id,
        stripeAccountId: accountId,
      }).catch(() => {});
      throw e;
    }
    return { id: paymentIntent.id };
  }

  async createTerminalSubscriptionSetup({
    readerId,
    tierId,
    artistId,
    accountId,
    amount,
    currency,
    userEmail,
    userId,
  }: CreateSubscriptionSetupArgs & {
    readerId: string;
  }): Promise<{ setupIntentId: string }> {
    return createAndDispatchTerminalSetupIntent({
      readerId,
      tierId,
      artistId,
      stripeAccountId: accountId,
      amount,
      currency,
      userEmail,
      userId,
    });
  }

  async getStatus({
    id,
    accountId,
  }: {
    id: string;
    accountId: string;
  }): Promise<PaymentStatusResult> {
    return getIntentStatus({ id, stripeAccountId: accountId });
  }

  async cancelSubscription({
    subscriptionKey,
    accountId,
    atPeriodEnd,
  }: {
    subscriptionKey: string;
    accountId: string;
    atPeriodEnd: boolean;
  }): Promise<void> {
    if (atPeriodEnd) {
      await stripe.subscriptions.update(
        subscriptionKey,
        { cancel_at_period_end: true },
        { stripeAccount: accountId }
      );
    } else {
      await stripe.subscriptions.cancel(subscriptionKey, {
        stripeAccount: accountId,
      });
    }
  }

  async cancel({
    id,
    accountId,
    readerId,
  }: {
    id: string;
    accountId: string;
    readerId?: string;
  }): Promise<{ id: string; status: string }> {
    if (readerId) {
      await cancelReaderActionForIntent({
        readerId,
        intentId: id,
        stripeAccountId: accountId,
      });
    }
    const intent = await cancelIntent({ id, stripeAccountId: accountId });
    return { id: intent.id, status: intent.status };
  }
}
