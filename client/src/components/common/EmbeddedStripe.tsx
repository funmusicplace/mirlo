import React from "react";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
}

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;
let stripePromise: ReturnType<typeof loadStripe> | undefined;
if (stripeKey) {
  stripePromise = loadStripe(stripeKey);
}
const EmbeddedStripeForm: React.FC<{ clientSecret: string }> = ({
  clientSecret,
}) => {
  if (stripePromise) {
    return (
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret: clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }
};

export default EmbeddedStripeForm;
