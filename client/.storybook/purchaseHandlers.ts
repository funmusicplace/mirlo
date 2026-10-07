import { http, HttpResponse } from "msw";

import type { DeferredQuote } from "../src/components/common/Purchase/usePurchase";

/**
 * Every POST /v1/purchase body a story sent, in order. `preview.tsx` clears
 * it before each story.
 */
export const purchaseMock: { bodies: Record<string, unknown>[] } = {
  bodies: [],
};

export const resetPurchaseMock = () => {
  purchaseMock.bodies = [];
};

export const paymentQuote = (
  overrides: Partial<DeferredQuote> = {}
): DeferredQuote => ({
  checkoutId: "checkout_storybook",
  mode: "payment",
  amount: 1000,
  currency: "usd",
  stripeAccountId: "acct_1",
  requiresShipping: false,
  buyerEmailKnown: true,
  artistName: "Lumen Tide",
  successUrl: null,
  ...overrides,
});

export const setupQuote = (overrides: Partial<DeferredQuote> = {}) =>
  paymentQuote({ mode: "setup", amount: undefined, ...overrides });

/**
 * POST /v1/purchase as the deferred flow sees it: the open call
 * (`deferred: true`) gets `quote`, the pay call (`{ checkoutId }`) gets a
 * client secret — the same one each time for a checkout, as the server does.
 */
export const purchaseHandler = (quote: DeferredQuote) =>
  http.post("*/v1/purchase", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    purchaseMock.bodies.push(body);
    if (body.deferred) {
      return HttpResponse.json({ deferred: quote });
    }
    const prefix = quote.mode === "setup" ? "seti" : "pi";
    return HttpResponse.json({
      clientSecret: `${prefix}_${body.checkoutId}_secret_storybook`,
      stripeAccountId: quote.stripeAccountId,
    });
  });
