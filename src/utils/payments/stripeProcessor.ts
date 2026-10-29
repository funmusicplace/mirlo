// Stripe implementation of the PaymentProcessor interface.
import logger from "../../logger";
import { SettingsType } from "../settings";
import stripe, {
  createOnlinePaymentIntent,
  findOrCreateStripeCustomer,
  hasStripeCredentials,
  refreshStripeClient,
  repriceStripeSubscription,
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
  CreatePledgeSetupArgs,
  CreateSubscriptionSetupArgs,
  UpdateSubscriptionTierArgs,
  PaymentAccountStatus,
  PaymentStatusResult,
  ShippingAddress,
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
    profileId,
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
      profileId,
      stripeAccountId: accountId,
      amount,
      currency,
      userEmail,
      userId,
    });
  }

  async createOnlineSubscriptionSetup({
    tierId,
    profileId,
    accountId,
    amount,
    currency,
    userEmail,
    userId,
    userName,
    oldTierId,
    oldStripeSubscriptionKey,
    shippingAddress,
    checkoutId,
  }: CreateSubscriptionSetupArgs & {
    oldTierId?: number;
    oldStripeSubscriptionKey?: string;
    shippingAddress?: ShippingAddress;
  }): Promise<{ setupIntentId: string; clientSecret: string | null }> {
    const setupIntent = await stripe.setupIntents.create(
      {
        automatic_payment_methods: { enabled: true },
        usage: "off_session",
        metadata: {
          tierId: String(tierId),
          artistId: String(profileId),
          stripeAccountId: accountId,
          amount: String(amount),
          currency,
          userEmail,
          ...(userId && { userId }),
          ...(userName?.trim() && { userName: userName.trim() }),
          ...(oldTierId !== undefined && { oldTierId: String(oldTierId) }),
          ...(oldStripeSubscriptionKey && { oldStripeSubscriptionKey }),
          ...(shippingAddress && {
            shippingAddress: JSON.stringify(shippingAddress),
          }),
          ...(checkoutId && { checkoutId }),
        },
      },
      { stripeAccount: accountId }
    );

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  async createOnlinePledgeSetup({
    fundraiserId,
    trackGroupId,
    profileId,
    accountId,
    amount,
    userEmail,
    userId,
    message,
    checkoutId,
  }: CreatePledgeSetupArgs): Promise<{
    setupIntentId: string;
    clientSecret: string | null;
  }> {
    const customer = await findOrCreateStripeCustomer(
      accountId,
      userId ? Number(userId) : undefined,
      userEmail
    );

    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        usage: "off_session",
        metadata: {
          fundraiserId: String(fundraiserId),
          trackGroupId: String(trackGroupId),
          artistId: String(profileId),
          stripeAccountId: accountId,
          userEmail,
          paymentIntentAmount: String(amount),
          ...(userId && { userId }),
          ...(message && { message }),
          ...(checkoutId && { checkoutId }),
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
  }: UpdateSubscriptionTierArgs): Promise<{ nextBillingDate?: Date }> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionKey, {
      stripeAccount: accountId,
    });
    return repriceStripeSubscription({
      subscription,
      accountId,
      tier,
      amount,
      currency,
      paymentBehavior: "error_if_incomplete",
    });
  }

  async createSubscriptionPaymentMethodSetup({
    subscriptionKey,
    accountId,
  }: {
    subscriptionKey: string;
    accountId: string;
  }): Promise<{ setupIntentId: string; clientSecret: string | null }> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionKey, {
      stripeAccount: accountId,
    });
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        usage: "off_session",
        metadata: {
          subscriptionKey,
          stripeAccountId: accountId,
        },
      },
      { stripeAccount: accountId }
    );

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
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
      logger.info(
        `Setting stripe subscription (${subscriptionKey}) to cancel at period end.`
      );
      await stripe.subscriptions.update(
        subscriptionKey,
        { cancel_at_period_end: true },
        { stripeAccount: accountId }
      );
    } else {
      logger.info(
        `Setting stripe subscription (${subscriptionKey}) to cancel immediately.`
      );
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

  async refresh(): Promise<void> {
    await refreshStripeClient();
  }

  isConfigured(settings: SettingsType): boolean {
    return hasStripeCredentials(settings.settings?.stripe);
  }

  async *listAccountStatuses(): AsyncIterable<PaymentAccountStatus> {
    for await (const account of stripe.accounts.list({ limit: 100 })) {
      yield {
        accountId: account.id,
        canReceivePayments: !!account.charges_enabled,
      };
    }
  }
}
