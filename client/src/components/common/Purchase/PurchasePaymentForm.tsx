import { css } from "@emotion/css";
import {
  AddressElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  StripeAddressElementChangeEvent,
  StripeError,
  StripePaymentElementChangeEvent,
} from "@stripe/stripe-js";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";
import useErrorHandler from "services/useErrorHandler";

import { Button } from "../Button";

/**
 * Inner payment form, rendered inside an <Elements> provider that already holds
 * the PaymentIntent clientSecret. Collects the payment method and confirms the
 * payment. Shared by every purchase flow (tip, trackGroup, merch, …) via
 * PurchaseModal, and by the full-page HostedCheckout.
 *
 * Completion has two modes:
 * - `onSuccess` provided → confirm with `redirect: "if_required"`. Payment
 *   methods that don't need a redirect (most cards) resolve in JS and we call
 *   `onSuccess` so the caller can navigate within the SPA — the page is not
 *   reloaded, so anything playing in the global audio player keeps going.
 *   Methods that genuinely require a redirect (3DS, bank redirects) still bounce
 *   to `returnUrl`, as Stripe mandates.
 * - `onSuccess` omitted → confirm with the default full redirect to `returnUrl`
 *   (used by HostedCheckout / external integrators that have no SPA to return to).
 */
const PurchasePaymentForm: React.FC<{
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: () => void;
  /** Physical merch: collect a shipping address via Stripe's AddressElement. */
  requiresShipping?: boolean;
  /** Country codes the artist actually ships to, for the AddressElement's picker. */
  allowedCountries?: string[];
  /** The clientSecret is a SetupIntent's (subscription sign-up) rather than a PaymentIntent's — confirm with `confirmSetup`, not `confirmPayment`. */
  isSetup?: boolean;
}> = ({
  returnUrl,
  buttonLabel,
  onSuccess,
  requiresShipping,
  allowedCountries,
  isSetup,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const handler = useErrorHandler();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [showButton, setShowButton] = React.useState(false);
  const [isFormComplete, setIsFormComplete] = React.useState(false);
  const [isAddressComplete, setIsAddressComplete] =
    React.useState(!requiresShipping);
  const [isLoading, setIsLoading] = React.useState(false);

  const resolveShipping = async () => {
    if (!requiresShipping || !elements) {
      return undefined;
    }
    const addressElement = elements.getElement(AddressElement);
    const result = await addressElement?.getValue();
    if (!result?.value) {
      return undefined;
    }
    const { name, address } = result.value;
    return {
      name,
      address: { ...address, line2: address.line2 ?? undefined },
    };
  };

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet.
      setIsLoading(false);
      return;
    }

    const shipping = await resolveShipping();
    // confirmSetup/confirmPayment have distinct Stripe SDK types (a
    // SetupIntent has no `shipping`), so the call itself can't be unified —
    // only the params shared between both branches are, here.
    const confirmParams = { return_url: returnUrl, shipping };

    if (onSuccess) {
      // Async completion: only redirect if the payment method requires it.
      const result = isSetup
        ? await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: returnUrl },
            redirect: "if_required",
          })
        : await stripe.confirmPayment({
            elements,
            confirmParams,
            redirect: "if_required",
          });

      if (result.error) {
        console.error(result.error);
        handler(result.error.message);
        setIsLoading(false);
        return;
      }

      const intent =
        "paymentIntent" in result ? result.paymentIntent : result.setupIntent;
      if (
        intent &&
        (intent.status === "succeeded" || intent.status === "processing")
      ) {
        // Hand control back to the caller, which navigates within the SPA.
        // Leave isLoading set — the view is about to change.
        onSuccess();
        return;
      }

      // Resolved without an error or a terminal status (e.g. it kicked off a
      // redirect, or needs another action). Nothing more to do here.
      setIsLoading(false);
      return;
    }

    const { error } = isSetup
      ? await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: returnUrl },
        })
      : await stripe.confirmPayment({
          elements,
          confirmParams,
        });

    // We only reach this point if there's an immediate error (e.g. incomplete
    // details). Otherwise the customer is redirected to `return_url`.
    if (error) {
      console.error(error);
      handler(error.message);
    }
    setIsLoading(false);
  };

  const handleOnError = ({
    error,
  }: {
    elementType: "payment";
    error: StripeError;
  }) => {
    console.error(error);
    handler(t("somethingWentWrongStripe") ?? "");
  };

  const handleOnChange = (e: StripePaymentElementChangeEvent) => {
    setIsFormComplete(e.complete);
  };

  const handleAddressOnChange = (e: StripeAddressElementChangeEvent) => {
    setIsAddressComplete(e.complete);
  };

  return (
    <div
      className={css`
        padding: 1rem;
        margin: auto;
      `}
    >
      {!showButton && <LoadingBlocks rows={1} />}
      {requiresShipping && (
        <AddressElement
          options={{
            mode: "shipping",
            ...(allowedCountries?.length ? { allowedCountries } : {}),
          }}
          onChange={handleAddressOnChange}
        />
      )}
      <PaymentElement
        options={{ layout: "accordion" }}
        onReady={() => setShowButton(true)}
        onLoadError={handleOnError}
        onChange={handleOnChange}
      />
      {showButton && (
        <Button
          onClick={handleSubmit}
          size="big"
          isLoading={isLoading}
          disabled={
            !stripe || !elements || !isFormComplete || !isAddressComplete
          }
          className={css`
            margin-top: 1rem;
          `}
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
};

export default PurchasePaymentForm;
