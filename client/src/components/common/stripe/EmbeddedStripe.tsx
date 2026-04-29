import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import React from "react";

import SetupIntentForm from "./SetupIntentForm";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

const EmbeddedStripeForm: React.FC<{
  clientSecret: string;
  stripe: Stripe;
  isSetupIntent?: boolean;
  onComplete?: () => void;
}> = ({ clientSecret, stripe, isSetupIntent, onComplete }) => {
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
      <EmbeddedCheckoutProvider
        stripe={stripe}
        options={{ clientSecret, onComplete }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }
};

const LoadStripeWrapper: React.FC<{
  clientSecret: string;
  isSetupIntent?: boolean;
  stripeAccountId: string;
  onComplete?: () => void;
}> = ({ clientSecret, isSetupIntent, stripeAccountId, onComplete }) => {
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
      onComplete={onComplete}
    />
  );
};

export default LoadStripeWrapper;
