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
  }>({ defaultValues: { monthlyContribution: true } });

  const { data: artistDetails } = useQuery(
    queryArtist({ artistSlug: artist.urlSlug ?? "", includeDefaultTier: true })
  );

  const options = artistDetails?.subscriptionTiers ?? [];

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
      snackbar(t("somethingWentWrong"), { type: "warning" });
      console.error(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
      onFinishedSubscribing?.(false);
    }
  };

  const value = methods.watch("tier");
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
      {value && (
        <Button
          onClick={() => subscribeToTier()}
          isLoading={isCheckingForSubscription}
          disabled={!methods.formState.isValid || !value}
          wrap
          className={css`
            width: 100% !important;
          `}
        >
          {t(!value ? "chooseToContinue" : "continueWithPrice", {
            amount: moneyDisplay({
              amount: value?.minAmount / 100,
              currency: value?.currency,
            }),
          })}
        </Button>
      )}
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
    </>
  );
};

export default SupportArtistTiersForm;
