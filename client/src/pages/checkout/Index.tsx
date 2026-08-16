import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import PurchasePaymentForm from "components/common/Purchase/PurchasePaymentForm";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryPurchaseIntent } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The Mirlo-hosted checkout page. External API consumers send a buyer here.
 */
function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "hostedCheckout" });
  const [searchParams] = useSearchParams();
  const intentId = searchParams.get("intentId") ?? "";
  const stripeAccountId = searchParams.get("stripeAccountId") ?? "";
  const { user } = useAuthContext();
  const errorHandler = useErrorHandler();
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState(false);

  const {
    data: intent,
    isLoading,
    isError,
  } = useQuery(queryPurchaseIntent({ intentId, stripeAccountId }));

  const stripePromise = React.useMemo(
    () =>
      stripeAccountId && stripeKey
        ? loadStripe(stripeKey, { stripeAccount: stripeAccountId })
        : null,
    [stripeAccountId]
  );

  if (!intentId || !stripeAccountId) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("missingParameters")}</Box>
      </WidthWrapper>
    );
  }

  if (isLoading) {
    return <FullPageLoadingSpinner />;
  }

  if (intent?.status === "succeeded") {
    if (intent.successUrl) {
      window.location.assign(intent.successUrl);
      return <FullPageLoadingSpinner />;
    }
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("alreadyComplete")}</Box>
      </WidthWrapper>
    );
  }

  if (isError || !intent?.clientSecret || !stripePromise) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("couldNotLoad")}</Box>
      </WidthWrapper>
    );
  }

  const returnUrl = intent.successUrl ?? window.location.origin;
  const isSetup = intent.clientSecret.startsWith("seti_");

  const needsEmail = !user && !intent.userEmail;

  const total =
    intent.amount != null
      ? moneyDisplay({
          amount: intent.amount / 100,
          currency: intent.currency ?? undefined,
        })
      : null;

  const summary =
    intent.artistName && total
      ? t("payingArtistAmount", {
          artistName: intent.artistName,
          amount: total,
        })
      : intent.artistName
        ? t("payingArtist", { artistName: intent.artistName })
        : total
          ? t("payingAmount", { amount: total })
          : null;

  const beforeConfirm = async () => {
    if (!user) {
      if (needsEmail && !EMAIL_REGEX.test(email)) {
        setEmailError(true);
        return false;
      }
      if (!needsEmail) {
        return true;
      }
    }

    try {
      await api.put(
        `purchase/${intentId}?stripeAccountId=${encodeURIComponent(stripeAccountId)}`,
        user ? {} : { email }
      );
      return true;
    } catch (e) {
      errorHandler(e);
      return false;
    }
  };

  return (
    <WidthWrapper variant="medium" className="mt-8 mb-12">
      <h1 className="text-xl mb-1">{t("title")}</h1>
      {summary && (
        <p className="mb-4 text-(--mi-lighten-foreground-color)">{summary}</p>
      )}
      {needsEmail && (
        <label className="flex flex-col gap-1 mb-4">
          <span>{t("yourEmailLabel")}</span>
          <InputEl
            type="email"
            name="email"
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
        </label>
      )}
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: intent.clientSecret }}
      >
        <PurchasePaymentForm
          returnUrl={returnUrl}
          buttonLabel={t("payNow")}
          isSetup={isSetup}
          requiresShipping={intent.requiresShipping}
          allowedCountries={intent.allowedCountries ?? undefined}
          clientSecret={intent.clientSecret}
          stripeAccountId={stripeAccountId}
          beforeConfirm={beforeConfirm}
        />
      </Elements>
    </WidthWrapper>
  );
}

export default Index;
