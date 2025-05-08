import { FormProvider, Controller, useForm } from "react-hook-form";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import SupportArtistPopUpTiers from "./SupportArtistPopUpTiers";
import { useAuthContext } from "state/AuthContext";
import Button from "./Button";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import api from "services/api";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { isEmpty } from "lodash";

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
      tier: user?.artistUserSubscriptions?.find(
        (s) => s.artistSubscriptionTier.artistId === artist.id
      )?.artistSubscriptionTier,
    },
  });

  const { data: artistDetails } = useQuery(
    queryArtist({ artistSlug: artist.urlSlug ?? "", includeDefaultTier: true })
  );

  const options = artistDetails?.subscriptionTiers ?? [];

  const unsubscribeFromArtist = async () => {
    try {
      setIsCheckingForSubscription(true);
      await api.delete(`artists/${artist.id}/subscribe`);
      snackbar(t("unsubscribedFromArtist"), { type: "success" });
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
      onFinishedSubscribing?.(false);
    }
  };

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
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
      onFinishedSubscribing?.(false);
    }
  };
  const value = methods.watch("tier");

  const noErrors =
    methods.formState.isValid || isEmpty(methods.formState.errors);
  return (
    <>
      {!artistDetails && <LoadingBlocks rows={1} />}
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
      <Button
        onClick={() => subscribeToTier()}
        isLoading={isCheckingForSubscription}
        disabled={!noErrors || !value}
        wrap
        className={css`
          width: 100% !important;
        `}
      >
        {!value && t("chooseToContinue")}
        {value &&
          value?.isDefaultTier &&
          t("followArtist", { artistName: artist.name })}
        {value &&
          !value.isDefaultTier &&
          t("continueWithPrice", {
            amount: moneyDisplay({
              amount: value?.minAmount / 100,
              currency: value?.currency,
            }),
          })}
      </Button>
      <Button
        onClick={() => unsubscribeFromArtist()}
        isLoading={isCheckingForSubscription}
        wrap
        className={css`
          width: 100% !important;
          margin-top: 1rem;
        `}
      >
        {t("unsubscribeFromArtist")}
      </Button>
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
