// Stripe implementation of the PaymentProcessor interface. This is a thin
// adapter: it delegates to the existing Stripe primitives in src/utils/stripe/*
// and maps their Stripe-shaped returns onto the neutral interface shape. Keeping
// the SDK calls in src/utils/stripe/ (rather than moving them here) means the
// terminal webhook path and other callers that still use them directly are
// untouched by this scaffolding step.

import stripe, {
  createOnlinePaymentIntent,
  createSubscriptionStripeProduct,
} from "../stripe";
import { getIntentStatus } from "../stripe/status";
import {
  createTerminalPaymentIntent,
  processPaymentOnReader,
  createAndDispatchTerminalSetupIntent,
  cancelIntent,
  cancelReaderActionForIntent,
  listTerminalReaders,
} from "../stripe/terminal";

import {
  PaymentProcessor,
  CreatePaymentArgs,
  CreateSubscriptionSetupArgs,
  UpdateSubscriptionTierArgs,
  PaymentStatusResult,
  TerminalReader,
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

  async createOnlineSubscriptionSetup({
    tierId,
    artistId,
    accountId,
    amount,
    currency,
    userEmail,
    userId,
    userName,
    oldTierId,
  }: CreateSubscriptionSetupArgs & {
    oldTierId?: number;
  }): Promise<{ setupIntentId: string; clientSecret: string | null }> {
    const setupIntent = await stripe.setupIntents.create(
      {
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          tierId: String(tierId),
          artistId: String(artistId),
          stripeAccountId: accountId,
          amount: String(amount),
          currency,
          userEmail,
          ...(userId && { userId }),
          ...(userName?.trim() && { userName: userName.trim() }),
          ...(oldTierId !== undefined && { oldTierId: String(oldTierId) }),
        },
      },
      { stripeAccount: accountId }
    );

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  async updateSubscriptionTier({
    subscriptionKey,
    accountId,
    tier,
    amount,
    currency,
  }: UpdateSubscriptionTierArgs): Promise<void> {
    // Independent Stripe calls: the product lookup and the subscription
    // retrieve (only needed for its existing item id) don't depend on each
    // other.
    const [productKey, subscription] = await Promise.all([
      createSubscriptionStripeProduct(tier, accountId),
      stripe.subscriptions.retrieve(subscriptionKey, {
        stripeAccount: accountId,
      }),
    ]);
    const itemId = subscription.items.data[0].id;

    await stripe.subscriptions.update(
      subscriptionKey,
      {
        items: [
          {
            id: itemId,
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
        // The new amount applies to the next invoice, not an immediate
        // charge — "increasing the monthly fee the next time they subscribe."
        proration_behavior: "none",
        cancel_at_period_end: false,
        // Tiers can carry different platform fees (see applyPlatformFee.ts),
        // so a tier switch must re-pin the fee to the new tier's — otherwise
        // Stripe keeps charging the old tier's percentage indefinitely.
        application_fee_percent: tier.platformPercent ?? 7,
      },
      { stripeAccount: accountId }
    );
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

  async listReaders({
    accountId,
  }: {
    accountId: string;
  }): Promise<TerminalReader[]> {
    const readers = await listTerminalReaders({
      stripeAccountId: accountId,
    });
    return readers.map((r) => ({
      id: r.id,
      label: r.label ?? null,
      deviceType: r.device_type,
      status: r.status ?? null,
    }));
  }
}
