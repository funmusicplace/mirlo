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
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

import { Button } from "../Button";
import FormComponent from "../FormComponent";
import { InputEl } from "../Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PurchasePaymentForm: React.FC<{
  returnUrl: string;
  buttonLabel: string;
  onSuccess?: (buyerEmail?: string) => void;
  requiresShipping?: boolean;
  allowedCountries?: string[];
  isSetup?: boolean;
  clientSecret?: string;
  stripeAccountId?: string;

  buyerEmailKnown?: boolean;
}> = ({
  returnUrl,
  buttonLabel,
  onSuccess,
  requiresShipping,
  allowedCountries,
  isSetup,
  clientSecret,
  stripeAccountId,
  buyerEmailKnown,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const handler = useErrorHandler();
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [showButton, setShowButton] = React.useState(false);
  const [isFormComplete, setIsFormComplete] = React.useState(false);
  const [isAddressComplete, setIsAddressComplete] =
    React.useState(!requiresShipping);
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState(false);

  const intentKnowsBuyer = buyerEmailKnown ?? !!user;
  const needsEmail = !intentKnowsBuyer && !user;

  const intentId = clientSecret?.split("_secret_")[0];

  const attachIdentity = async (): Promise<boolean> => {
    if (intentKnowsBuyer) {
      return true;
    }

    if (needsEmail && !EMAIL_REGEX.test(email)) {
      setEmailError(true);
      return false;
    }

    if (!intentId || !stripeAccountId) {
      handler(new Error("Missing clientSecret/stripeAccountId for the buyer"));
      return false;
    }

    try {
      await api.put(
        `purchase/${intentId}?stripeAccountId=${encodeURIComponent(stripeAccountId)}`,
        needsEmail ? { email } : {}
      );
      return true;
    } catch (e) {
      handler(e);
      return false;
    }
  };

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

    if (!(await attachIdentity())) {
      setIsLoading(false);
      return;
    }

    const shipping = await resolveShipping();
    const confirmParams = {
      return_url: returnUrl,
      shipping,
      ...(needsEmail && { receipt_email: email }),
    };

    if (isSetup && requiresShipping && shipping) {
      if (!intentId || !stripeAccountId) {
        handler(new Error("Missing clientSecret/stripeAccountId for shipping"));
        setIsLoading(false);
        return;
      }
      try {
        await api.put(
          `purchase/${intentId}?stripeAccountId=${encodeURIComponent(stripeAccountId)}`,
          { shippingAddress: shipping }
        );
      } catch (e) {
        handler(e);
        setIsLoading(false);
        return;
      }
    }

    if (onSuccess) {
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
        onSuccess(needsEmail ? email : undefined);
        return;
      }

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
