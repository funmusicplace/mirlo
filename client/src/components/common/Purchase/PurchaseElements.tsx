import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import React from "react";

import PurchasePaymentForm from "./PurchasePaymentForm";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

/**
 * Loads Stripe.js for the connected account and renders the Payment Element.
 * Container-agnostic: drop it into a page, or render it in place of a form.
 * Flows whose trigger already lives inside a modal (album, tip) render this
 * inline — swapping the buy form for the payment step within the *same* modal —
 * rather than opening a second dialog. `PurchaseModal` wraps it in a `<Modal>`
 * for any standalone buy-button that isn't already inside one.
 */
const PurchaseElements: React.FC<{
  clientSecret: string;
  stripeAccountId: string;
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: () => void;
}> = ({ clientSecret, stripeAccountId, returnUrl, buttonLabel, onSuccess }) => {
  // Load Stripe.js once per connected account. Passing the promise straight to
  // <Elements> means the instance is created once, not re-created each render.
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
      />
    </Elements>
  );
};

export default PurchaseElements;
