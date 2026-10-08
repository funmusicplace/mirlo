import FormComponent from "components/common/FormComponent";
import { InputEl, colorInputClass } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const COLOR_FIELDS = [
  { key: "button", labelKey: "colorButton" },
  { key: "buttonText", labelKey: "colorButtonText" },
  { key: "text", labelKey: "colorText" },
  { key: "background", labelKey: "colorBackground" },
] as const;

const IdentitySettingsSection: React.FC<{ hideTitle?: boolean }> = ({
  hideTitle,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <SettingsSection
      id="settings-identity"
      title={t("identitySettings")}
      hideTitle={hideTitle}
    >
      <FormComponent>
        <label htmlFor="input-instance-name">{t("instanceName")}</label>
        <InputEl
          id="input-instance-name"
          type="text"
          className="max-w-md"
          maxLength={60}
          {...register("instanceCustomization.title")}
        />
      </FormComponent>

      <fieldset>
        <legend className="mb-2 font-semibold">{t("colors")}</legend>
        <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
          {COLOR_FIELDS.map(({ key, labelKey }) => (
            <FormComponent key={key}>
              <label htmlFor={`input-color-${key}`}>{t(labelKey)}</label>
              <InputEl
                id={`input-color-${key}`}
                type="color"
                className={colorInputClass}
                {...register(`instanceCustomization.colors.${key}`)}
              />
            </FormComponent>
          ))}
        </div>
      </fieldset>
    </SettingsSection>
  );
};

export default IdentitySettingsSection;
