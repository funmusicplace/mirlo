import { QueryFunction, queryOptions } from "@tanstack/react-query";

import * as api from "./fetch/fetchWrapper";

export type PurchaseIntent = {
  id: string;
  status: string;
  clientSecret: string | null;
  successUrl: string | null;
  /** Total in the smallest currency unit (e.g. cents). Null for SetupIntents. */
  amount: number | null;
  currency: string | null;
  artistName: string | null;
  /** Physical merch, or a collectAddress subscription tier — render an AddressElement before confirming. */
  requiresShipping: boolean;
  allowedCountries: string[] | null;
  /** The buyer's email, if already known. Null when the checkout page still needs to collect one (e.g. an external caller initiated this without a logged-in user or an email). */
  userEmail: string | null;
};

const fetchPurchaseIntent: QueryFunction<
  PurchaseIntent,
  ["fetchPurchaseIntent", { intentId: string; stripeAccountId: string }]
> = ({ queryKey: [_, { intentId, stripeAccountId }], signal }) => {
  return api
    .get<{
      result: PurchaseIntent;
    }>(
      `v1/purchase/${intentId}?stripeAccountId=${encodeURIComponent(stripeAccountId)}`,
      { signal }
    )
    .then((r) => r.result);
};

export function queryPurchaseIntent(opts: {
  /** A PaymentIntent (pi_*) or SetupIntent (seti_*) id. */
  intentId: string;
  stripeAccountId: string;
}) {
  return queryOptions({
    queryKey: [
      "fetchPurchaseIntent",
      {
        intentId: opts.intentId,
        stripeAccountId: opts.stripeAccountId,
      },
    ],
    queryFn: fetchPurchaseIntent,
    enabled: !!opts.intentId && !!opts.stripeAccountId,
    // A one-shot fetch of an intent's secret/status: never goes stale within a
    // page session, and a transient failure isn't worth retrying here.
    staleTime: Infinity,
    retry: false,
  });
}
