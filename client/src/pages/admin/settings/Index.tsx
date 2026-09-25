import { useQuery } from "@tanstack/react-query";
import FeaturedArtistsSelector from "components/Admin/FeaturedArtistsSelector";
import EmailProviderSection from "components/Admin/settings/EmailProviderSection";
import GeneralSettingsSection from "components/Admin/settings/GeneralSettingsSection";
import PoliciesSection from "components/Admin/settings/PoliciesSection";
import SecuritySection from "components/Admin/settings/SecuritySection";
import SettingsActionsBar from "components/Admin/settings/SettingsActionsBar";
import {
  FormSettings,
  SettingsFromAPI,
} from "components/Admin/settings/settingsForm";
import SettingsSection from "components/Admin/settings/SettingsSection";
import SettingsSectionNav from "components/Admin/settings/SettingsSectionNav";
import StorageSection from "components/Admin/settings/StorageSection";
import StripeSection from "components/Admin/settings/StripeSection";
import TrustLevelsSection from "components/Admin/settings/TrustLevelsSection";
import WidthContainer from "components/common/WidthContainer";
import { queryFeaturedArtists } from "queries/settings";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

const Index = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const [isLoading, setIsLoading] = React.useState(false);
  const methods = useForm<FormSettings>();
  const { reset, handleSubmit } = methods;
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
          <div className="grid grid-cols-[12rem_minmax(0,1fr)] gap-10 max-md:grid-cols-1 max-md:gap-6">
            <SettingsSectionNav />
            <div className="max-w-2xl">
              <GeneralSettingsSection />
              <SettingsSection
                id="settings-featured-artists"
                title={t("featuredArtists")}
              >
                <FeaturedArtistsSelector
                  value={featuredArtists}
                  onChange={setFeaturedArtistsOverride}
                />
              </SettingsSection>

              <StripeSection />

              <EmailProviderSection />

              <StorageSection />

              <PoliciesSection />

              <TrustLevelsSection />

              <SecuritySection />
            </div>
          </div>
        </form>
      </FormProvider>
    </WidthContainer>
  );
};

export default Index;
