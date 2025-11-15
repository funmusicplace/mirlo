import { FormProvider, Controller, useForm } from "react-hook-form";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import SupportArtistPopUpTiers from "./SupportArtistPopUpTiers";
import { useAuthContext } from "state/AuthContext";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

import api from "services/api";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { isEmpty } from "lodash";
import useErrorHandler from "services/useErrorHandler";
import { ArtistButton } from "components/Artist/ArtistButtons";
import useGetArtistSubscriptionTiers from "utils/useGetArtistSubscriptionTiers";
import { Turnstile } from "@marsidev/react-turnstile";

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
    };
    monthlyContribution: boolean;
    email: string;
  }>({
    defaultValues: {
      monthlyContribution: true,
      tier: currentTier,
    },
  });

  const subscribeToTier = async () => {
    try {
      setIsCheckingForSubscription(true);
      const tier = methods.getValues("tier");
      const email = methods.getValues("email");
      if (!tier.isDefaultTier) {
        const response = await api.post<
          { tierId: number; email: string },
          { sessionUrl: string }
        >(`artists/${artist.id}/subscribe`, {
          tierId: tier.id,
          email,
        });
        window.location.assign(response.sessionUrl);
      } else {
        await api.post(`artists/${artist.id}/follow`, {
          email,
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
  const value = methods.watch("tier");

  const noErrors =
    methods.formState.isValid || isEmpty(methods.formState.errors);

  const isSubscribedToCurrentTier =
    value && currentTier && value.id === currentTier.id;

  return (
    <>
      {!artistDetails && <LoadingBlocks rows={1} margin="1rem" />}
      <FormProvider {...methods}>
        <Controller
          name="tier"
          control={methods.control}
          render={({ ...props }) => (
            <SupportArtistPopUpTiers
              {...props}
              options={
                excludeDefault
                  ? options.filter((option) => !option.isDefaultTier)
                  : options
              }
            />
          )}
        />

        {!user && (
          <FormComponent>
            {t("email")}
            <InputEl {...methods.register("email")} type="email" required />
          </FormComponent>
        )}
      </FormProvider>

      <Turnstile
        className={css`
          width: 100%;
        `}
        siteKey={import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY}
      />

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
          t("continueWithPrice", {
            amount: moneyDisplay({
              amount: value?.minAmount / 100,
              currency: value?.currency,
            }),
          })}
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
    </>
  );
};

export default SupportArtistTiersForm;
