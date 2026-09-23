import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import FeaturedArtistsSelector from "components/Admin/FeaturedArtistsSelector";
import EmailProviderSection from "components/Admin/settings/EmailProviderSection";
import GeneralSettingsSection from "components/Admin/settings/GeneralSettingsSection";
import PoliciesSection from "components/Admin/settings/PoliciesSection";
import SettingsActionsBar from "components/Admin/settings/SettingsActionsBar";
import {
  FormSettings,
  SettingsFromAPI,
} from "components/Admin/settings/settingsForm";
import SettingsSectionNav from "components/Admin/settings/SettingsSectionNav";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import WidthContainer from "components/common/WidthContainer";
import { queryFeaturedArtists } from "queries/settings";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import { bp } from "../../../constants";

const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 12rem minmax(0, 1fr);
  gap: 2.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
`;

const Index = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const [isLoading, setIsLoading] = React.useState(false);
  const methods = useForm<FormSettings>();
  const { reset, register, handleSubmit, watch } = methods;
  const stripeKeyConfigured = watch("stripe.keyConfigured");
  const useConsolidatedBuckets = watch("useConsolidatedBuckets");
  const { data: initialFeaturedArtists } = useQuery(queryFeaturedArtists());
  const [featuredArtistsOverride, setFeaturedArtistsOverride] = React.useState<
    Artist[] | undefined
  >(undefined);
  const featuredArtists =
    featuredArtistsOverride ?? initialFeaturedArtists ?? [];

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      const response =
        await api.get<Partial<SettingsFromAPI>>("admin/settings/");
      reset({
        isClosedToPublicArtistSignup:
          response.result.isClosedToPublicArtistSignup,
        showQueueDashboard: response.result.showQueueDashboard,
        platformPercent: response.result.settings?.platformPercent,
        cdnUrl: response.result.cdnUrl,
        instanceCustomization: {
          ...response.result.settings?.instanceCustomization,
          colors: {
            button: "#be3455",
            buttonText: "#ffffff",
            background: "#ffffff",
            text: "#000000",
            ...response.result.settings?.instanceCustomization?.colors,
          },
        },
        stripe: {
          ...response.result.settings?.stripe,
          key: "",
        },
        emailProvider: {
          ...response.result.settings?.emailProvider,
        },
        useConsolidatedBuckets: response.result.bucketNames != null,
        bucketPrefix: response.result.bucketNames?.prefix ?? "",
        cloudflareTurnstileSecret:
          response.result.settings?.cloudflareTurnstileSecret,
        terms: response.result.terms,
        privacyPolicy: response.result.privacyPolicy,
        cookiePolicy: response.result.cookiePolicy,
        contentPolicy: response.result.contentPolicy,
        defconLevel: response.result.defconLevel,
        trustLevelNames: DEFAULT_TRUST_LEVEL_NAMES.map(
          (defaultName, level) =>
            response.result.settings?.trustLevelNames?.[level]?.trim() ||
            defaultName
        ),
      });
      setIsLoading(false);
      snackbar("Settings loaded", { type: "success" });
    };
    callback();
  }, [reset]);

  const updateSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      try {
        await api.post("admin/settings", {
          settings: {
            platformPercent: data.platformPercent,
            instanceCustomization: {
              ...data.instanceCustomization,
            },
            stripe: {
              ...data.stripe,
            },
            emailProvider: {
              ...data.emailProvider,
            },
            cloudflareTurnstileSecret: data.cloudflareTurnstileSecret,
            featuredArtistIds: featuredArtists.map((a) => a.id),
            trustLevelNames: data.trustLevelNames,
          },
          cdnUrl: data.cdnUrl,
          bucketNames: data.useConsolidatedBuckets
            ? { prefix: data.bucketPrefix ?? "" }
            : null,
          terms: data.terms,
          showQueueDashboard: data.showQueueDashboard,
          isClosedToPublicArtistSignup: data.isClosedToPublicArtistSignup,
          privacyPolicy: data.privacyPolicy,
          cookiePolicy: data.cookiePolicy,
          contentPolicy: data.contentPolicy,
          defconLevel: Number(data.defconLevel),
        });
        snackbar("Settings updated", { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [snackbar, featuredArtists]
  );

  return (
    <WidthContainer variant="big" justify="center" className="px-4 pb-4">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(updateSettings)}>
          <SettingsActionsBar isSaving={isLoading} />
          <SettingsLayout>
            <SettingsSectionNav />
            <div className="max-w-2xl">
              <GeneralSettingsSection />
              <fieldset
                id="settings-featured-artists"
                className="mb-8 scroll-mt-32"
              >
                <legend className="mb-2 text-lg font-semibold">
                  {t("featuredArtists")}
                </legend>
                <FeaturedArtistsSelector
                  value={featuredArtists}
                  onChange={setFeaturedArtistsOverride}
                />
              </fieldset>

              <fieldset id="settings-stripe" className="mb-8 scroll-mt-32">
                <legend className="mb-2 text-lg font-semibold">
                  {t("stripeSettings")}
                </legend>
                <FormComponent>
                  <label htmlFor="input-stripe-key">
                    {t("stripeSecretKey")}
                  </label>
                  <InputEl
                    id="input-stripe-key"
                    type="password"
                    className="max-w-md"
                    placeholder={
                      stripeKeyConfigured
                        ? t("stripeKeyPlaceholderConfigured")
                        : t("stripeKeyPlaceholderEmpty")
                    }
                    {...register("stripe.key")}
                  />
                </FormComponent>
                <FormComponent>
                  <label htmlFor="input-stripe-webhook-connect-signing-secret">
                    {t("stripeWebhookConnectSigningSecret")}
                  </label>
                  <InputEl
                    id="input-stripe-webhook-connect-signing-secret"
                    type="text"
                    className="max-w-md"
                    {...register("stripe.webhookConnectSigningSecret")}
                  />
                </FormComponent>
              </fieldset>

              <EmailProviderSection />

              <fieldset id="settings-storage" className="mb-8 scroll-mt-32">
                <legend className="mb-2 text-lg font-semibold">
                  {t("storage")}
                </legend>
                <FormComponent direction="row">
                  <InputEl
                    id="input-use-consolidated-buckets"
                    type="checkbox"
                    aria-describedby="hint-use-consolidated-buckets"
                    {...register("useConsolidatedBuckets")}
                  />
                  <div className="flex flex-col">
                    <label htmlFor="input-use-consolidated-buckets">
                      {t("useConsolidatedBuckets")}
                    </label>
                    <small
                      id="hint-use-consolidated-buckets"
                      className="max-w-md"
                    >
                      {t("useConsolidatedBucketsHint")}
                    </small>
                  </div>
                </FormComponent>
                {useConsolidatedBuckets && (
                  <FormComponent>
                    <label htmlFor="input-bucket-prefix">
                      {t("bucketPrefix")}
                    </label>
                    <InputEl
                      id="input-bucket-prefix"
                      type="text"
                      className="max-w-xs"
                      placeholder={t("bucketPrefixPlaceholder")}
                      {...register("bucketPrefix")}
                    />
                  </FormComponent>
                )}
              </fieldset>

              <PoliciesSection />

              <fieldset
                id="settings-trust-levels"
                className="mb-8 scroll-mt-32"
              >
                <legend className="mb-2 text-lg font-semibold">
                  {t("trustLevels")}
                </legend>
                {DEFAULT_TRUST_LEVEL_NAMES.map((defaultName, level) => (
                  <FormComponent key={level}>
                    <label htmlFor={`input-trust-level-name-${level}`}>
                      {t("trustLevelName", { level })}
                    </label>
                    <InputEl
                      id={`input-trust-level-name-${level}`}
                      type="text"
                      className="max-w-xs"
                      placeholder={defaultName}
                      {...register(`trustLevelNames.${level}`)}
                    />
                  </FormComponent>
                ))}
              </fieldset>

              <fieldset id="settings-security" className="mb-8 scroll-mt-32">
                <legend className="mb-2 text-lg font-semibold">
                  {t("security")}
                </legend>
                <FormComponent>
                  <label htmlFor="input-cloudflare-turnstile-secret">
                    {t("cloudflareTurnstileSecret")}
                  </label>
                  <InputEl
                    id="input-cloudflare-turnstile-secret"
                    type="text"
                    className="max-w-md"
                    {...register("cloudflareTurnstileSecret")}
                  />
                </FormComponent>
                <FormComponent>
                  <label htmlFor="input-defcon-level">{t("defconLevel")}</label>
                  <InputEl
                    id="input-defcon-level"
                    type="text"
                    className="max-w-xs"
                    {...register("defconLevel")}
                  />
                </FormComponent>
              </fieldset>
            </div>
          </SettingsLayout>
        </form>
      </FormProvider>
    </WidthContainer>
  );
};

export default Index;
