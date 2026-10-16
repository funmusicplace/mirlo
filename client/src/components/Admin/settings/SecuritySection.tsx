import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const DEFCON_LEVELS = [0, 1, 2] as const;

const SecuritySection: React.FC<{ hideTitle?: boolean }> = ({ hideTitle }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch } = useFormContext<FormSettings>();
  const secretConfigured = watch("cloudflareTurnstileSecretConfigured");
  const defconLevel = watch("defconLevel");

  return (
    <SettingsSection
      id="settings-security"
      title={t("security")}
      hideTitle={hideTitle}
    >
      <FormComponent>
        <label htmlFor="input-cloudflare-turnstile-secret">
          {t("cloudflareTurnstileSecret")}
        </label>
        <InputEl
          id="input-cloudflare-turnstile-secret"
          type="password"
          className="max-w-md"
          placeholder={
            secretConfigured
              ? t("cloudflareTurnstileSecretPlaceholderConfigured")
              : t("cloudflareTurnstileSecretPlaceholderEmpty")
          }
          {...register("cloudflareTurnstileSecret")}
        />
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-defcon-level">{t("defconLevel")}</label>
        <SelectEl
          id="input-defcon-level"
          className="max-w-md"
          aria-describedby="description-defcon-level hint-defcon-level"
          {...register("defconLevel", { valueAsNumber: true })}
        >
          {DEFCON_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`defconLevelOption${level}`)}
            </option>
          ))}
        </SelectEl>
        <small id="description-defcon-level">
          {DEFCON_LEVELS.some((level) => level === defconLevel) &&
            t(`defconLevelDescription${defconLevel}`)}
        </small>
        <small id="hint-defcon-level">{t("defconLevelHint")}</small>
      </FormComponent>
    </SettingsSection>
  );
};

export default SecuritySection;
