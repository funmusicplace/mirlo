import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const PlatformPolicySection: React.FC<{ hideTitle?: boolean }> = ({
  hideTitle,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <SettingsSection
      id="settings-platform-policy"
      title={t("platformPolicySettings")}
      hideTitle={hideTitle}
    >
      <FormComponent>
        <label htmlFor="input-platform-percent">{t("platformPercent")}</label>
        <InputEl
          id="input-platform-percent"
          type="number"
          className="max-w-xs"
          {...register("platformPercent")}
        />
      </FormComponent>

      <FormComponent direction="row">
        <InputEl
          id="input-is-closed-to-public-artist-signup"
          type="checkbox"
          aria-describedby="hint-is-closed-to-public-artist-signup"
          {...register("isClosedToPublicArtistSignup")}
        />
        <div className="flex flex-col">
          <label htmlFor="input-is-closed-to-public-artist-signup">
            {t("isClosedToPublicArtistSignup")}
          </label>
          <small id="hint-is-closed-to-public-artist-signup">
            <Trans
              t={t}
              i18nKey="isClosedToPublicArtistSignupHint"
              components={{ invitesLink: <Link to="/admin/content/invites" /> }}
            />
          </small>
        </div>
      </FormComponent>
    </SettingsSection>
  );
};

export default PlatformPolicySection;
