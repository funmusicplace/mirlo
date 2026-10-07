import { useMutation } from "@tanstack/react-query";
import type { DeferredQuote } from "components/common/Purchase/usePurchase";

import * as api from "./fetch/fetchWrapper";

export type HostedCheckoutResponse = {
  deferred?: DeferredQuote;
  redirectUrl?: string;
  success?: boolean;
};

const openHostedCheckout = (checkoutId: string) =>
  api.post<{ checkoutId: string; deferred: true }, HostedCheckoutResponse>(
    "v1/purchase",
    { checkoutId, deferred: true }
  );

export function useOpenHostedCheckoutMutation() {
  return useMutation({ mutationFn: openHostedCheckout });
}
