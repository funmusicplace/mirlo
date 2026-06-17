// Provider-neutral payment interface. Today there is exactly one implementation
// (Stripe), but every Flow B call site (the unified `POST /v1/purchase` path and
// the status poll) goes through this interface rather than the Stripe SDK
// directly. Swapping processors means implementing this interface once and
// changing `getPaymentProcessor` — no call-site touches `Stripe`.
//
// Scope: Flow B only (raw PaymentIntent / SetupIntent). Flow A (Checkout
// Sessions in src/utils/stripe/sessions.ts) is intentionally NOT modelled here —
// it is being retired by the simplify-purchasing migration, so wrapping it would
// be throwaway work.

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

  /** Current status of a pending charge/authorisation, by intent id. */
  getStatus(args: {
    id: string;
    accountId: string;
  }): Promise<PaymentStatusResult>;
}

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
};

import { StripePaymentProcessor } from "./stripeProcessor";

const stripeProcessor = new StripePaymentProcessor();

/**
 * Returns the configured payment processor. Today this is always Stripe; a
 * future swap (or self-hoster choice) wires the selection in here so no caller
 * has to change.
 */
export const getPaymentProcessor = (): PaymentProcessor => stripeProcessor;
