import React, { useState } from "react";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "../Button";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";

const SetupIntentForm: React.FC<{
  clientSecret: string;
}> = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const handler = useErrorHandler();

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return null;
    }

    const { error } = await stripe.confirmSetup({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      handler(error.message);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
    }
  };

  return (
    <div
      className={css`
        padding: 1rem;
        margin: auto;
      `}
    >
      <PaymentElement options={{ layout: "accordion" }} />
      <Button
        onClick={handleSubmit}
        size="big"
        className={css`
          margin-top: 1rem;
        `}
      >
        Back this project
      </Button>
    </div>
  );
};

export default SetupIntentForm;
