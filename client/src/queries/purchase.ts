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
};

const fetchPurchaseIntent: QueryFunction<
  PurchaseIntent,
  ["fetchPurchaseIntent", { paymentIntentId: string; stripeAccountId: string }]
> = ({ queryKey: [_, { paymentIntentId, stripeAccountId }], signal }) => {
  return api
    .get<{
      result: PurchaseIntent;
    }>(`v1/purchase/${paymentIntentId}?stripeAccountId=${encodeURIComponent(stripeAccountId)}`, { signal })
    .then((r) => r.result);
};

export function queryPurchaseIntent(opts: {
  paymentIntentId: string;
  stripeAccountId: string;
}) {
  return queryOptions({
    queryKey: [
      "fetchPurchaseIntent",
      {
        paymentIntentId: opts.paymentIntentId,
        stripeAccountId: opts.stripeAccountId,
      },
    ],
    queryFn: fetchPurchaseIntent,
    enabled: !!opts.paymentIntentId && !!opts.stripeAccountId,
    // A one-shot fetch of an intent's secret/status: never goes stale within a
    // page session, and a transient failure isn't worth retrying here.
    staleTime: Infinity,
    retry: false,
  });
}
