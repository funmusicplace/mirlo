import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import React from "react";

import PurchasePaymentForm from "./PurchasePaymentForm";
import type { Checkout } from "./usePurchase";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

const PurchaseElements: React.FC<{
  checkout: Checkout;
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: (buyerEmail?: string) => void;
}> = ({ checkout, returnUrl, buttonLabel, onSuccess }) => {
  const stripeAccountId =
    checkout.kind === "deferred"
      ? checkout.quote.stripeAccountId
      : checkout.stripeAccountId;

  const stripePromise = React.useMemo(
    () =>
      stripeAccountId && stripeKey
        ? loadStripe(stripeKey, { stripeAccount: stripeAccountId })
        : null,
    [stripeAccountId]
  );

  const clientSecret =
    checkout.kind === "intent" ? checkout.clientSecret : undefined;
  const quote = checkout.kind === "deferred" ? checkout.quote : undefined;
  const mode = quote?.mode;
  const amount = quote?.amount;
  const currency = quote?.currency;
  const options: StripeElementsOptions = React.useMemo(() => {
    if (clientSecret) {
      return { clientSecret };
    }
    return mode === "setup"
      ? { mode, currency }
      : { mode: "payment", amount: amount ?? 0, currency };
  }, [clientSecret, mode, amount, currency]);

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PurchasePaymentForm
        checkout={checkout}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
      />
    </Elements>
  );
};

export default PurchaseElements;
