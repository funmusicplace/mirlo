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
 * Mirlo-hosted checkout page. External API consumers send a buyer here (via the
 * `redirectUrl` returned by `POST /v1/purchase` with `hosted: true`) so they can
 * complete payment without building their own Stripe UI. It fetches the
 * intent's clientSecret + return target from the API — a PaymentIntent for a
 * one-time purchase, or a SetupIntent for a subscription sign-up/switch — and
 * renders the shared Payment/Setup Element full-page. On success Stripe
 * redirects to the server-supplied `successUrl` (or Mirlo's home as a
 * fallback).
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

  // Load Stripe.js once per connected account (created once, not per render).
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

  // The buyer landed back here after already paying (e.g. a reload): bounce them
  // onward, or confirm completion when there's nowhere to send them.
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
  // SetupIntent client secrets are always `seti_`-prefixed (see
  // PurchaseElements.tsx) — a subscription sign-up/switch confirms with
  // `confirmSetup`, not `confirmPayment`.
  const isSetup = intent.clientSecret.startsWith("seti_");

  // The Payment/Setup Element doesn't collect an email itself, so a buyer who
  // isn't logged in — and whose email wasn't already known when this intent
  // was created (e.g. an external caller that didn't collect one) — has to
  // type one in here before the purchase can be attributed to anyone.
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

  // Runs right before Stripe confirms the payment/setup: attaches the buyer's
  // identity to the intent so the webhook that fires on success has someone
  // to register the purchase against. A logged-in user always wins over
  // whatever the intent was initiated with; otherwise the email typed in
  // above is required (and skipped entirely if the intent already has one).
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
