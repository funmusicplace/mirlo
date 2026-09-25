import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DEFAULT_TRUST_LEVEL_NAMES } from "utils/trustLevel";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const TrustLevelsSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <SettingsSection id="settings-trust-levels" title={t("trustLevels")}>
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
    </SettingsSection>
  );
};

export default TrustLevelsSection;
