import { loadStripe } from "@stripe/stripe-js";
import { queryOptions } from "@tanstack/react-query";
import type { PurchaseResponse } from "components/common/Purchase/usePurchase";

import * as api from "./fetch/fetchWrapper";

/**
 * Quotes the checkout a hosted checkout link points at. Nothing is created
 * with the payment processor until the buyer pays, and re-quoting an open
 * checkout returns that same checkout, so this is safe to repeat.
 */
export function queryHostedCheckout(checkoutId: string) {
  return queryOptions({
    queryKey: ["hostedCheckout", { checkoutId }],
    queryFn: ({ signal }) =>
      api.post<{ checkoutId: string; deferred: true }, PurchaseResponse>(
        "v1/purchase",
        { checkoutId, deferred: true },
        { signal }
      ),
    enabled: !!checkoutId,
    // The quote backs a payment form the buyer may already be filling in:
    // don't re-quote underneath them.
    staleTime: Infinity,
    retry: false,
  });
}

export function queryPaymentIntentStatus({
  clientSecret,
  stripeAccountId,
  stripeKey,
}: {
  clientSecret: string;
  stripeAccountId: string;
  stripeKey?: string;
}) {
  return queryOptions({
    queryKey: ["paymentIntentStatus", { clientSecret, stripeAccountId }],
    queryFn: async () => {
      const stripe = await loadStripe(stripeKey ?? "", {
        stripeAccount: stripeAccountId,
      });
      const result = await stripe?.retrievePaymentIntent(clientSecret);
      if (!result?.paymentIntent) {
        throw new Error(result?.error?.message ?? "Payment not found");
      }
      return result.paymentIntent.status;
    },
    enabled: !!clientSecret && !!stripeAccountId && !!stripeKey,
    retry: false,
  });
}
