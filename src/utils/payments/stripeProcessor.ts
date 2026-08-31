// Stripe implementation of the PaymentProcessor interface.
import logger from "../../logger";
import { AppError } from "../error";
import { calculatePlatformPercent } from "../processingPayments";
import stripe, {
  attachIntentIdentity,
  attachSetupIntentShippingAddress,
  createOnlinePaymentIntent,
  createSubscriptionStripeProduct,
  findOrCreateStripeCustomer,
  isSetupIntentId,
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
    successUrl,
    oldTierId,
    oldStripeSubscriptionKey,
    requiresShipping,
    allowedCountries,
  }: CreateSubscriptionSetupArgs & {
    oldTierId?: number;
    oldStripeSubscriptionKey?: string;
    requiresShipping?: boolean;
    allowedCountries?: string[];
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
          ...(successUrl && { successUrl }),
          ...(oldTierId !== undefined && { oldTierId: String(oldTierId) }),
          ...(oldStripeSubscriptionKey && { oldStripeSubscriptionKey }),
          ...(requiresShipping && { requiresShipping: "true" }),
          ...(allowedCountries?.length && {
            allowedCountries: allowedCountries.join(","),
          }),
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
    artistId,
    accountId,
    amount,
    userEmail,
    userId,
    message,
    successUrl,
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
          artistId: String(artistId),
          stripeAccountId: accountId,
          userEmail,
          paymentIntentAmount: String(amount),
          ...(userId && { userId }),
          ...(message && { message }),
          ...(successUrl && { successUrl }),
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
        proration_behavior: "none",
        cancel_at_period_end: false,
        application_fee_percent: await calculatePlatformPercent(
          currency || "usd",
          tier.platformPercent ?? tier.profile.defaultPlatformFee
        ),
      },
      { stripeAccount: accountId }
    );
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

  async attachIdentity({
    id,
    accountId,
    userId,
    userEmail,
  }: {
    id: string;
    accountId: string;
    userId?: number;
    userEmail: string;
  }): Promise<void> {
    await attachIntentIdentity({
      id,
      stripeAccountId: accountId,
      userId,
      userEmail,
    });
  }

  async attachShippingAddress({
    id,
    accountId,
    shippingAddress,
  }: {
    id: string;
    accountId: string;
    shippingAddress: { name?: string; address: Record<string, unknown> };
  }): Promise<void> {
    if (!isSetupIntentId(id)) {
      throw new AppError({
        httpCode: 400,
        description: "Only a SetupIntent (seti_*) accepts a shipping address",
      });
    }

    await attachSetupIntentShippingAddress({
      setupIntentId: id,
      stripeAccountId: accountId,
      shippingAddress,
    });
  }
}
