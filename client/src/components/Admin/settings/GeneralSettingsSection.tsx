import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const GeneralSettingsSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <SettingsSection id="settings-general" title={t("generalSettings")}>
      <FormComponent>
        <label htmlFor="input-cdn-url">{t("cdnUrl")}</label>
        <InputEl
          id="input-cdn-url"
          type="text"
          className="max-w-md"
          {...register("cdnUrl")}
        />
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-show-queue-dashboard"
          type="checkbox"
          {...register("showQueueDashboard")}
        />
        <label htmlFor="input-show-queue-dashboard">
          {t("showQueueDashboard")}
        </label>
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-show-hero-on-home"
          type="checkbox"
          {...register("instanceCustomization.showHeroOnHome")}
        />
        <label htmlFor="input-show-hero-on-home">{t("showHeroOnHome")}</label>
      </FormComponent>

      <FormComponent>
        <label htmlFor="input-instance-artist-id">
          {t("instanceArtistId")}
        </label>
        <InputEl
          id="input-instance-artist-id"
          type="number"
          className="max-w-xs"
          {...register("instanceCustomization.artistId")}
        />
      </FormComponent>
    </SettingsSection>
  );
};

export default GeneralSettingsSection;
