import { css } from "@emotion/css";
import { Turnstile } from "@marsidev/react-turnstile";
import { ArtistButton } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { isEmpty } from "lodash";
import React from "react";
import { FormProvider, Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";
import useGetArtistSubscriptionTiers from "utils/useGetArtistSubscriptionTiers";

import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import { moneyDisplay } from "./Money";
import EmbeddedStripeForm from "./stripe/EmbeddedStripe";
import SupportArtistPopUpTiers from "./SupportArtistPopUpTiers";

const SupportArtistTiersForm: React.FC<{
  artist: Pick<Artist, "id" | "name" | "userId" | "urlSlug">;
  onFinishedSubscribing?: (val: boolean) => void;
  excludeDefault?: boolean;
}> = ({ artist, onFinishedSubscribing, excludeDefault }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { user, refreshLoggedInUser } = useAuthContext();
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);

  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const {
    data: artistDetails,
    tiers: options,
    currentTier,
  } = useGetArtistSubscriptionTiers(artist.urlSlug);

  const methods = useForm<{
    tier: {
      id: number;
      name: string;
      description: string;
      isDefaultTier: boolean;
      currency: string;
      minAmount: number;
      interval: "MONTH" | "YEAR";
    };
    monthlyContribution: boolean;
    email: string;
  }>({
    defaultValues: {
      monthlyContribution: true,
      tier: currentTier,
    },
  });

  const navigate = useNavigate();
  const [checkout, setCheckout] = React.useState<{
    clientSecret: string;
    stripeAccountId: string;
  } | null>(null);

  const subscribeToTier = async () => {
    try {
      setIsCheckingForSubscription(true);
      const tier = methods.getValues("tier");
      const email = methods.getValues("email");
      if (!tier.isDefaultTier) {
        const response = await api.post<
          { tierId: number; email: string; embedded: boolean },
          { clientSecret: string; stripeAccountId: string }
        >(`artists/${artist.id}/subscribe`, {
          tierId: tier.id,
          email,
          embedded: true,
        });
        if (response.clientSecret) {
          setCheckout({
            clientSecret: response.clientSecret,
            stripeAccountId: response.stripeAccountId,
          });
          return;
        }
      } else {
        // @ts-ignore
        const cfTurnstile = turnstile.getResponse();
        await api.post(`artists/${artist.id}/follow`, {
          email,
          cfTurnstile,
        });
      }
      if (!user) {
        snackbar(t("verificationEmailSent"), { type: "success" });
      }
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
      onFinishedSubscribing?.(false);
    }
  };

  const handleEmbeddedComplete = React.useCallback(() => {
    const params = new URLSearchParams();
    params.set("purchaseType", "subscription");
    refreshLoggedInUser();
    navigate(`${getArtistUrl(artist)}/checkout-complete?${params.toString()}`);
  }, [artist, navigate, refreshLoggedInUser]);

  const value = methods.watch("tier");

  const effectiveOptions = excludeDefault
    ? options.filter((option) => !option.isDefaultTier)
    : options;

  const singleOption =
    effectiveOptions.length === 1 ? effectiveOptions[0] : null;

  const singleOptionCurrency = artistDetails?.user?.currency ?? "usd";

  React.useEffect(() => {
    if (singleOption && value?.id !== singleOption.id) {
      methods.setValue(
        "tier",
        {
          ...singleOption,
          currency: singleOptionCurrency,
          minAmount: singleOption.minAmount ?? 0,
        },
        { shouldDirty: false }
      );
    }
  }, [singleOption, singleOptionCurrency, value?.id, methods]);

  // All hooks must run before this early return, otherwise React throws
  // "Rendered fewer hooks than expected" once `checkout` is set.
  if (checkout) {
    return (
      <EmbeddedStripeForm
        clientSecret={checkout.clientSecret}
        stripeAccountId={checkout.stripeAccountId}
        onComplete={handleEmbeddedComplete}
      />
    );
  }

  const noErrors =
    methods.formState.isValid || isEmpty(methods.formState.errors);

  const isSubscribedToCurrentTier =
    value && currentTier && value.id === currentTier.id;

  return (
    <>
      {!artistDetails && <LoadingBlocks rows={1} margin="1rem" />}
      <FormProvider {...methods}>
        {!singleOption && (
          <Controller
            name="tier"
            control={methods.control}
            render={({ ...props }) => (
              <SupportArtistPopUpTiers
                {...props}
                currency={artistDetails?.user?.currency ?? "usd"}
                options={effectiveOptions}
              />
            )}
          />
        )}

        {!user && (
          <FormComponent>
            {t("email")}
            <InputEl {...methods.register("email")} type="email" required />
          </FormComponent>
        )}
      </FormProvider>

      <ArtistButton
        onClick={() => subscribeToTier()}
        isLoading={isCheckingForSubscription}
        disabled={!noErrors || !value || isSubscribedToCurrentTier}
        wrap
        className={css`
          width: 100% !important;
          margin-top: 0.25rem;
        `}
      >
        {isSubscribedToCurrentTier &&
          (value?.isDefaultTier
            ? t("youAreFollowingThisArtist", { artistName: artist.name })
            : t("youAreAlreadySubscribed"))}
        {!value && !isSubscribedToCurrentTier && t("chooseToContinue")}
        {value?.id !== currentTier?.id &&
          value &&
          value?.isDefaultTier &&
          t("followArtist", { artistName: artist.name })}
        {value &&
          !value.isDefaultTier &&
          !isSubscribedToCurrentTier &&
          t(
            value.interval === "MONTH"
              ? "continueWithPriceMonthly"
              : "continueWithPriceYearly",
            {
              amount: moneyDisplay({
                amount: value?.minAmount / 100,
                currency: value?.currency,
              }),
            }
          )}
      </ArtistButton>

      {value && !value.isDefaultTier && (
        <div
          className={css`
            margin-top: 1rem;

            small {
              display: block;
              margin-bottom: 0.5rem;
            }
          `}
        >
          <small>{t("artistCheckoutPage")}</small>
        </div>
      )}

      <div
        className={css`
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        `}
      >
        <Turnstile siteKey={import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY} />
      </div>
    </>
  );
};

export default SupportArtistTiersForm;
