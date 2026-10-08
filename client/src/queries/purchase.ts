import { QueryFunction, queryOptions } from "@tanstack/react-query";
import type { DeferredQuote } from "components/common/Purchase/usePurchase";

import * as api from "./fetch/fetchWrapper";

export type HostedCheckoutResponse = {
  deferred?: DeferredQuote;
  success?: boolean;
  successUrl?: string;
};

const fetchHostedCheckout: QueryFunction<
  HostedCheckoutResponse,
  ["fetchHostedCheckout", { checkoutId: string }]
> = ({ queryKey: [_, { checkoutId }], signal }) =>
  api.post<{ checkoutId: string; deferred: true }, HostedCheckoutResponse>(
    "v1/purchase",
    { checkoutId, deferred: true },
    { signal }
  );

export function queryHostedCheckout(checkoutId: string) {
  return queryOptions({
    queryKey: ["fetchHostedCheckout", { checkoutId }],
    queryFn: fetchHostedCheckout,
    enabled: !!checkoutId,
    staleTime: Infinity,
    retry: false,
  });
}
