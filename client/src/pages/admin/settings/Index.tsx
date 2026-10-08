import FeaturedArtistsSelector from "components/Admin/FeaturedArtistsSelector";
import EmailProviderSection from "components/Admin/settings/EmailProviderSection";
import GeneralSettingsSection from "components/Admin/settings/GeneralSettingsSection";
import PoliciesSection from "components/Admin/settings/PoliciesSection";
import SecuritySection from "components/Admin/settings/SecuritySection";
import SettingsActionsBar from "components/Admin/settings/SettingsActionsBar";
import { FormSettings } from "components/Admin/settings/settingsForm";
import SettingsSection from "components/Admin/settings/SettingsSection";
import SettingsSectionNav from "components/Admin/settings/SettingsSectionNav";
import StorageSection from "components/Admin/settings/StorageSection";
import StripeSection from "components/Admin/settings/StripeSection";
import TrustLevelsSection from "components/Admin/settings/TrustLevelsSection";
import useAdminSettingsForm from "components/Admin/settings/useAdminSettingsForm";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

const Index = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);
  const {
    methods,
    isLoaded,
    hasLoadError,
    featuredArtists,
    setFeaturedArtistsOverride,
    saveSettings,
  } = useAdminSettingsForm();
  const { handleSubmit } = methods;

  React.useEffect(() => {
    if (isLoaded) {
      snackbar("Settings loaded", { type: "success" });
    }
  }, [isLoaded, snackbar]);

  React.useEffect(() => {
    if (hasLoadError) {
      snackbar("Oops something went wrong", { type: "warning" });
    }
  }, [hasLoadError, snackbar]);

  const updateSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      setIsSaving(true);
      try {
        await saveSettings(data);
        snackbar("Settings updated", { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      } finally {
        setIsSaving(false);
      }
    },
    [saveSettings, snackbar]
  );

  return (
    <WidthContainer variant="big" justify="center" className="px-4 pb-4">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(updateSettings)}>
          <SettingsActionsBar isSaving={isSaving} isDisabled={!isLoaded} />
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
