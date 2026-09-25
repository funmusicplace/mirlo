import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const SecuritySection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <SettingsSection id="settings-security" title={t("security")}>
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
    </SettingsSection>
  );
};

export default SecuritySection;
