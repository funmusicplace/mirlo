// Provider-neutral payment interface.
import { Prisma } from "@mirlo/prisma/client";

export type CreatePaymentArgs = {
  amount: number;
  currency: string;
  accountId: string;
  applicationFeeAmount: number;
  metadata: Record<string, string>;
};

export type CreateSubscriptionSetupArgs = {
  tierId: number;
  artistId: number;
  accountId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userId?: string;
  userName?: string;
  successUrl?: string;
};

export type CreatePledgeSetupArgs = {
  fundraiserId: number;
  trackGroupId: number;
  artistId: number;
  accountId: string;
  amount: number;
  userEmail: string;
  userId?: string;
  message?: string;
  successUrl?: string;
};

export type UpdateSubscriptionTierArgs = {
  subscriptionKey: string;
  accountId: string;
  tier: Prisma.ProfileSubscriptionTierGetPayload<{
    include: { profile: true };
  }>;
  amount: number;
  currency: string;
};

export interface PaymentProcessor {
  createOnlinePayment(
    args: CreatePaymentArgs
  ): Promise<{ id: string; clientSecret: string | null }>;

  createTerminalPayment(
    args: CreatePaymentArgs & { readerId: string }
  ): Promise<{ id: string }>;

  createTerminalSubscriptionSetup(
    args: CreateSubscriptionSetupArgs & { readerId: string }
  ): Promise<{ setupIntentId: string }>;

  createOnlineSubscriptionSetup(
    args: CreateSubscriptionSetupArgs & {
      oldTierId?: number;
      oldStripeSubscriptionKey?: string;
      requiresShipping?: boolean;
      allowedCountries?: string[];
    }
  ): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  createOnlinePledgeSetup(
    args: CreatePledgeSetupArgs
  ): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  updateSubscriptionTier(args: UpdateSubscriptionTierArgs): Promise<void>;

  createSubscriptionPaymentMethodSetup(args: {
    subscriptionKey: string;
    accountId: string;
  }): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  getStatus(args: {
    id: string;
    accountId: string;
  }): Promise<PaymentStatusResult>;

  cancelSubscription(args: {
    subscriptionKey: string;
    accountId: string;
    atPeriodEnd: boolean;
  }): Promise<void>;

  cancel(args: {
    id: string;
    accountId: string;
    readerId?: string;
  }): Promise<{ id: string; status: string }>;

  listReaders(args: { accountId: string }): Promise<TerminalReader[]>;

  attachIdentity(args: {
    id: string;
    accountId: string;
    userId?: number;
    userEmail: string;
  }): Promise<void>;

  attachShippingAddress(args: {
    id: string;
    accountId: string;
    shippingAddress: { name?: string; address: Record<string, unknown> };
  }): Promise<void>;
}

export type TerminalReader = {
  id: string;
  label: string | null;
  deviceType: string;
  status: string | null;
};

export type PaymentStatusResult = {
  id: string;
  status: string;
  clientSecret: string | null;
  successUrl: string | null;
  amount: number | null;
  currency: string | null;
  artistId: string | null;
  requiresShipping: boolean;
  allowedCountries: string[] | null;
  userEmail: string | null;
};

import { StripePaymentProcessor } from "./stripeProcessor";

const stripeProcessor = new StripePaymentProcessor();

/**
 * Returns the configured payment processor. Currently Stripe.
 */
export const getPaymentProcessor = (): PaymentProcessor => stripeProcessor;
