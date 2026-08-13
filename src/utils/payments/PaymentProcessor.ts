// Provider-neutral payment interface. Today there is exactly one implementation
// (Stripe), but every unified-flow call site (the `POST /v1/purchase` path and
// the status poll) goes through this interface rather than the Stripe SDK
// directly. Swapping processors means implementing this interface once and
// changing `getPaymentProcessor` — no call-site touches `Stripe`.
//
// Scope: the unified flow only — raw PaymentIntents/SetupIntents, plus the
// recurring-subscription lifecycle built on top of them (creation and
// in-place repricing). The legacy Checkout Session flow (still live in
// src/utils/stripe/sessions.ts for a few unmigrated item types) is
// intentionally NOT modelled here — it is being retired by the
// simplify-purchasing migration, so wrapping it would be throwaway work.

import { Prisma } from "@mirlo/prisma/client";

/** Args for an immediate one-time charge (online or terminal). */
export type CreatePaymentArgs = {
  amount: number;
  currency: string;
  /** The connected account the charge settles on. */
  accountId: string;
  applicationFeeAmount: number;
  metadata: Record<string, string>;
};

/** Args for a recurring subscription's payment-method authorisation (SetupIntent). */
export type CreateSubscriptionSetupArgs = {
  tierId: number;
  artistId: number;
  accountId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userId?: string;
  /** Self-chosen display name, captured when the buyer has no account name yet. */
  userName?: string;
  /** Where the hosted checkout page sends the buyer after payment, if one was supplied at initiation. */
  successUrl?: string;
};

/** Args for a fundraiser pledge's payment-method authorisation (SetupIntent) — the pledge is only charged later, if/when the fundraiser's goal is met. */
export type CreatePledgeSetupArgs = {
  fundraiserId: number;
  trackGroupId: number;
  artistId: number;
  accountId: string;
  /** The pledged amount, in cents — charged later, not now. */
  amount: number;
  userEmail: string;
  userId?: string;
  message?: string;
};

/** Args for reprising an existing recurring subscription in place. */
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
  /**
   * Create an online one-time charge. Returns the intent id plus the
   * client-side secret the frontend completes the payment with.
   */
  createOnlinePayment(
    args: CreatePaymentArgs
  ): Promise<{ id: string; clientSecret: string | null }>;

  /**
   * Create a one-time charge and dispatch it to a physical reader (in-person).
   * Combines intent creation + reader dispatch into one step.
   */
  createTerminalPayment(
    args: CreatePaymentArgs & { readerId: string }
  ): Promise<{ id: string }>;

  /**
   * Create a subscription payment-method authorisation and dispatch it to a
   * reader (in-person subscription sign-up).
   */
  createTerminalSubscriptionSetup(
    args: CreateSubscriptionSetupArgs & { readerId: string }
  ): Promise<{ setupIntentId: string }>;

  /**
   * Create a subscription payment-method authorisation for the buyer to
   * confirm online (no reader dispatch). `oldTierId`, when present, is
   * carried in the SetupIntent's metadata so the tier being switched away
   * from is only cancelled once this new subscription is confirmed active —
   * never before. `oldStripeSubscriptionKey`, when present, is the Stripe
   * subscription this new one supersedes (same tier or not) — cancelled the
   * same way, once the new one is confirmed.
   */
  createOnlineSubscriptionSetup(
    args: CreateSubscriptionSetupArgs & {
      oldTierId?: number;
      oldStripeSubscriptionKey?: string;
      /** The tier needs a shipping address — persisted onto the SetupIntent's metadata so a redirect-away-and-back (hosted checkout) can still recover it via getStatus. */
      requiresShipping?: boolean;
      allowedCountries?: string[];
    }
  ): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  /**
   * Create a payment-method authorisation for a fundraiser pledge — no
   * immediate charge. The pledge itself is recorded when this SetupIntent
   * succeeds (see `handleSetupIntentSucceeded`'s `fundraiserId` branch); the
   * actual charge happens later, off this saved payment method, only if/when
   * the fundraiser's all-or-nothing goal is met.
   */
  createOnlinePledgeSetup(
    args: CreatePledgeSetupArgs
  ): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  /**
   * Reprice an existing recurring subscription in place — no new SetupIntent,
   * no card re-entry. `proration_behavior: "none"` (enforced by the
   * implementation) means the new amount applies to the *next* invoice, not
   * an immediate charge.
   */
  updateSubscriptionTier(args: UpdateSubscriptionTierArgs): Promise<void>;

  /**
   * Create a SetupIntent to collect a new payment method for an *existing*
   * recurring subscription — no new subscription, no product/price lookup,
   * no DB row change. On confirmation, the resulting payment method becomes
   * the subscription's `default_payment_method` (see
   * `handleSubscriptionPaymentMethodUpdateSucceeded`).
   */
  createSubscriptionPaymentMethodSetup(args: {
    subscriptionKey: string;
    accountId: string;
  }): Promise<{ setupIntentId: string; clientSecret: string | null }>;

  /** Current status of a pending charge/authorisation, by intent id. */
  getStatus(args: {
    id: string;
    accountId: string;
  }): Promise<PaymentStatusResult>;

  /**
   * Cancel a recurring subscription on the connected account. `atPeriodEnd:
   * true` lets the already-paid period run out — billing stops and the
   * processor fires its subscription-deleted webhook when the period ends,
   * which is when access is actually revoked. `false` cancels immediately.
   */
  cancelSubscription(args: {
    subscriptionKey: string;
    accountId: string;
    atPeriodEnd: boolean;
  }): Promise<void>;

  /**
   * Cancel a pending charge/authorisation. When `readerId` is supplied, also
   * clears the reader's screen if it is still working on this intent (a
   * customer walked away, wrong item, etc.).
   */
  cancel(args: {
    id: string;
    accountId: string;
    readerId?: string;
  }): Promise<{ id: string; status: string }>;

  /** Physical card readers registered on the connected account. */
  listReaders(args: { accountId: string }): Promise<TerminalReader[]>;
}

export type TerminalReader = {
  id: string;
  label: string | null;
  deviceType: string;
  status: string | null;
};

/**
 * Status of a pending charge/authorisation, plus the bits the hosted checkout
 * page needs to render and complete the payment. `amount`/`currency` are null
 * for setup authorisations (no immediate charge).
 */
export type PaymentStatusResult = {
  id: string;
  status: string;
  clientSecret: string | null;
  successUrl: string | null;
  amount: number | null;
  currency: string | null;
  artistId: string | null;
  /** Physical merch, or a `collectAddress` subscription tier — the hosted checkout page needs to render an AddressElement. */
  requiresShipping: boolean;
  allowedCountries: string[] | null;
  /** The buyer's email, if already known (a logged-in purchase, or one initiated with an email). Null when the hosted checkout page still needs to collect one. */
  userEmail: string | null;
};

import { StripePaymentProcessor } from "./stripeProcessor";

const stripeProcessor = new StripePaymentProcessor();

/**
 * Returns the configured payment processor. Today this is always Stripe; a
 * future swap (or self-hoster choice) wires the selection in here so no caller
 * has to change.
 */
export const getPaymentProcessor = (): PaymentProcessor => stripeProcessor;
