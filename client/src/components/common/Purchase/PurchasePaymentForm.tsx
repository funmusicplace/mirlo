import {
  AddressElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ConfirmPaymentData,
  StripeAddressElementChangeEvent,
  StripeError,
  StripePaymentElementChangeEvent,
} from "@stripe/stripe-js";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

import { Button } from "../Button";
import FormComponent from "../FormComponent";
import { InputEl } from "../Input";

import type { Checkout } from "./usePurchase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ShippingAddress = NonNullable<ConfirmPaymentData["shipping"]>;

const PurchasePaymentForm: React.FC<{
  checkout: Checkout;
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: (buyerEmail?: string) => void;
}> = ({ checkout, returnUrl, buttonLabel, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const handler = useErrorHandler();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const quote = checkout.kind === "deferred" ? checkout.quote : undefined;
  const isSetup = quote
    ? quote.mode === "setup"
    : checkout.kind === "intent" && checkout.clientSecret.startsWith("seti_");
  const requiresShipping = !!quote?.requiresShipping;
  const allowedCountries = quote?.allowedCountries;
  // The server already accounts for who's logged in when it sets this.
  const needsEmail = !!quote && !quote.buyerEmailKnown;

  const [showButton, setShowButton] = React.useState(false);
  const [isFormComplete, setIsFormComplete] = React.useState(false);
  const [isAddressComplete, setIsAddressComplete] =
    React.useState(!requiresShipping);
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState(false);

  const resolveShipping = async (): Promise<ShippingAddress | undefined> => {
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

  const resolveClientSecret = async (
    shipping?: ShippingAddress
  ): Promise<{ clientSecret: string } | { alreadyPaid: true } | undefined> => {
    if (checkout.kind === "intent") {
      return { clientSecret: checkout.clientSecret };
    }
    try {
      const response = await api.post<
        {
          checkoutId: string;
          email?: string;
          shippingAddress?: ShippingAddress;
          amount?: number;
        },
        { clientSecret?: string; success?: boolean }
      >("purchase", {
        checkoutId: checkout.quote.checkoutId,
        ...(needsEmail && { email }),
        ...(!isSetup && { amount: checkout.quote.amount }),
        ...(isSetup && shipping && { shippingAddress: shipping }),
      });
      if (response.success) {
        return { alreadyPaid: true };
      }
      if (!response.clientSecret) {
        throw new Error("Payment could not be started.");
      }
      return { clientSecret: response.clientSecret };
    } catch (e) {
      handler(e);
      return undefined;
    }
  };

  /** Paid: hand back to the caller, or leave for the return URL. */
  const finish = () => {
    if (onSuccess) {
      onSuccess(needsEmail ? email : undefined);
    } else {
      window.location.assign(returnUrl);
    }
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

    if (needsEmail && !EMAIL_REGEX.test(email)) {
      setEmailError(true);
      setIsLoading(false);
      return;
    }

    if (checkout.kind === "deferred") {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error(submitError);
        setIsLoading(false);
        return;
      }
    }

    const shipping = await resolveShipping();
    const resolved = await resolveClientSecret(shipping);
    if (!resolved) {
      setIsLoading(false);
      return;
    }
    if ("alreadyPaid" in resolved) {
      finish();
      return;
    }
    const { clientSecret } = resolved;

    // "if_required" keeps the buyer here unless their bank demands a hop
    // (3DS), in which case Stripe sends them to returnUrl and back.
    const result = isSetup
      ? await stripe.confirmSetup({
          elements,
          clientSecret,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        })
      : await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl,
            shipping,
            ...(needsEmail && { receipt_email: email }),
          },
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
      finish();
      return;
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
    <div className="p-4 m-auto">
      {!showButton && <LoadingBlocks rows={1} />}
      {needsEmail && (
        <FormComponent>
          <label htmlFor="purchase-buyer-email">{t("email")}</label>
          <InputEl
            id="purchase-buyer-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(false);
            }}
          />
          {emailError && (
            <small className="text-(--mi-warning-color)">
              {t("invalidEmail")}
            </small>
          )}
          <small>{t("emailReceiptHint")}</small>
        </FormComponent>
      )}
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
            !stripe ||
            !elements ||
            !isFormComplete ||
            !isAddressComplete ||
            (needsEmail && !email)
          }
          className="mt-4"
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
};

export default PurchasePaymentForm;
