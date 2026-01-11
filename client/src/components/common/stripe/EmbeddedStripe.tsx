import React, { useState } from "react";

import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
  Elements,
} from "@stripe/react-stripe-js";

import SetupIntentForm from "./SetupIntentForm";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

const EmbeddedStripeForm: React.FC<{
  clientSecret: string;
  stripe: Stripe;
  isSetupIntent?: boolean;
}> = ({ clientSecret, stripe, isSetupIntent }) => {
  if (stripe) {
    if (isSetupIntent) {
      return (
        <Elements
          stripe={stripe}
          options={{
            clientSecret,
          }}
        >
          <SetupIntentForm clientSecret={clientSecret} />
        </Elements>
      );
    }
    return (
      <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }
};

const LoadStripeWrapper: React.FC<{
  clientSecret: string;
  isSetupIntent?: boolean;
  stripeAccountId: string;
}> = ({ clientSecret, isSetupIntent, stripeAccountId }) => {
  const [stripe, setStripe] = React.useState<Stripe | null>();

  const callback = React.useCallback(
    async (stripeKey: string, stripeAccountId?: string) => {
      const loadedStripe = await loadStripe(stripeKey, {
        stripeAccount: stripeAccountId,
      });
      setStripe(loadedStripe);
    },
    []
  );

  React.useEffect(() => {
    if (stripeKey) {
      callback(stripeKey, stripeAccountId);
    }
  }, [stripeKey, stripeAccountId]);

  if (!stripe) return null;
  return (
    <EmbeddedStripeForm
      clientSecret={clientSecret}
      stripe={stripe}
      isSetupIntent={isSetupIntent}
    />
  );
};

export default LoadStripeWrapper;
