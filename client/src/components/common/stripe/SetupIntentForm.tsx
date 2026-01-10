import React, { useState } from "react";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "../Button";
import { css } from "@emotion/css";
import useErrorHandler from "services/useErrorHandler";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { useTranslation } from "react-i18next";
import {
  StripeError,
  StripePaymentElementChangeEvent,
} from "@stripe/stripe-js";

const SetupIntentForm: React.FC<{
  clientSecret: string;
}> = ({ clientSecret }) => {
  const stripe = useStripe();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const elements = useElements();
  const handler = useErrorHandler();
  const [showButton, setShowButton] = useState(false);
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    setIsLoading(true);
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
      console.error(error);
      handler(error.message);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
    }
    setIsLoading(false);
  };

  const handleOnReady = () => {
    setShowButton(true);
  };

  const handleOnError = ({
    elementType,
    error,
  }: {
    elementType: "payment";
    error: StripeError;
  }) => {
    console.error(error);
    handler(t("somethingWentWrongStripe") ?? "");
  };

  const handleOnChange = (e: StripePaymentElementChangeEvent) => {
    if (e.complete) {
      setIsFormComplete(true);
    }
  };

  return (
    <div
      className={css`
        padding: 1rem;
        margin: auto;
      `}
    >
      {!showButton && <LoadingBlocks rows={1} />}
      <PaymentElement
        options={{ layout: "accordion" }}
        onReady={handleOnReady}
        onLoadError={handleOnError}
        onChange={handleOnChange}
      />
      {showButton && (
        <Button
          onClick={handleSubmit}
          size="big"
          isLoading={isLoading}
          disabled={!stripe || !elements || !isFormComplete}
          className={css`
            margin-top: 1rem;
          `}
        >
          {t("backThisProject")}
        </Button>
      )}
    </div>
  );
};

export default SetupIntentForm;
