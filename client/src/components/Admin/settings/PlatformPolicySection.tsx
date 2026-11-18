import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { stripeCurrencyCodes } from "utils/currencyCodes";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const PlatformPolicySection: React.FC<{
  hideTitle?: boolean;
  hideInvitesLink?: boolean;
}> = ({ hideTitle, hideInvitesLink }) => {
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
        <div className="flex items-center gap-2">
          <InputEl
            id="input-platform-percent"
            type="number"
            min={0}
            max={100}
            className="max-w-xs"
            {...register("platformPercent")}
          />
          <span aria-hidden="true">%</span>
        </div>
      </FormComponent>

      <FormComponent>
        <label htmlFor="input-default-currency">{t("defaultCurrency")}</label>
        <SelectEl
          id="input-default-currency"
          className="max-w-xs"
          aria-describedby="hint-default-currency"
          {...register("defaultCurrency")}
        >
          {stripeCurrencyCodes.map((code) => (
            <option value={code.toLowerCase()} key={code}>
              {code}
            </option>
          ))}
        </SelectEl>
        <small id="hint-default-currency">{t("defaultCurrencyHint")}</small>
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
              components={{
                invitesLink: hideInvitesLink ? (
                  <span />
                ) : (
                  <Link to="/admin/content/invites" />
                ),
              }}
            />
          </small>
        </div>
      </FormComponent>
    </SettingsSection>
  );
};

export default PlatformPolicySection;
