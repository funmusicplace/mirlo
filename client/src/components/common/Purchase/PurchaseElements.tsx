import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React from "react";

import PurchasePaymentForm from "./PurchasePaymentForm";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

const PurchaseElements: React.FC<{
  clientSecret: string;
  stripeAccountId: string;
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: (buyerEmail?: string) => void;
  requiresShipping?: boolean;
  allowedCountries?: string[];
  /** See PurchasePaymentForm — only the hosted checkout page needs to set this. */
  buyerEmailKnown?: boolean;
}> = ({
  clientSecret,
  stripeAccountId,
  returnUrl,
  buttonLabel,
  onSuccess,
  requiresShipping,
  allowedCountries,
  buyerEmailKnown,
}) => {
  const stripePromise = React.useMemo(
    () =>
      stripeAccountId && stripeKey
        ? loadStripe(stripeKey, { stripeAccount: stripeAccountId })
        : null,
    [stripeAccountId]
  );

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PurchasePaymentForm
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
        requiresShipping={requiresShipping}
        allowedCountries={allowedCountries}
        buyerEmailKnown={buyerEmailKnown}
        isSetup={clientSecret.startsWith("seti_")}
        clientSecret={clientSecret}
        stripeAccountId={stripeAccountId}
      />
    </Elements>
  );
};

export default PurchaseElements;
