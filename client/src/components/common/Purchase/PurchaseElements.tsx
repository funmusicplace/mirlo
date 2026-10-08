import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useStripePublishableKey } from "queries/instanceSettings";
import React from "react";

import PurchasePaymentForm from "./PurchasePaymentForm";
import type { Checkout } from "./usePurchase";

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
  const stripeKey = useStripePublishableKey();

  const stripePromise = React.useMemo(
    () =>
      stripeAccountId && stripeKey
        ? loadStripe(stripeKey, { stripeAccount: stripeAccountId })
        : null,
    [stripeAccountId, stripeKey]
  );

  // <Elements> compares options deeply, so this needn't be memoized.
  const options: StripeElementsOptions =
    checkout.kind === "intent"
      ? { clientSecret: checkout.clientSecret }
      : checkout.quote.mode === "setup"
        ? { mode: "setup", currency: checkout.quote.currency }
        : {
            mode: "payment",
            amount: checkout.quote.amount ?? 0,
            currency: checkout.quote.currency,
          };

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
