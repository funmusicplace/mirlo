import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { usePrefersContrastMore } from "hooks/usePrefersContrastMore";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const OPTIONS: HighContrastPreference[] = ["system", "on", "off"];

const HighContrastRadio: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { watch, setValue } = useFormContext<{
    properties?: { highContrast?: HighContrastPreference };
  }>();
  const prefersContrastMore = usePrefersContrastMore();
  const highContrast = watch("properties.highContrast") ?? "system";

  const handleChange = (nextValue: HighContrastPreference) => {
    setValue("properties.highContrast", nextValue, { shouldDirty: true });
  };

  const labelKey: Record<HighContrastPreference, string> = {
    system: "highContrastSystem",
    on: "highContrastOn",
    off: "highContrastOff",
  };

  return (
    <FormComponent>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold mb-1">{t("highContrast")}</legend>
        <p className="text-sm mb-2">{t("highContrastDescription")}</p>
        {OPTIONS.map((option) => (
          <label
            key={option}
            htmlFor={`input-high-contrast-${option}`}
            className="flex items-start gap-2 cursor-pointer"
          >
            <InputEl
              id={`input-high-contrast-${option}`}
              type="radio"
              name="highContrast"
              value={option}
              checked={highContrast === option}
              onChange={() => handleChange(option)}
              className="mt-1 w-4 shrink-0"
              aria-describedby={
                option === "system" ? "hint-high-contrast-system" : undefined
              }
            />
            <div>
              <span className="font-medium">{t(labelKey[option])}</span>
              {option === "system" && (
                <small id="hint-high-contrast-system" className="block mt-1">
                  {t(
                    prefersContrastMore
                      ? "highContrastSystemActive"
                      : "highContrastSystemInactive"
                  )}
                </small>
              )}
            </div>
          </label>
        ))}
      </fieldset>
    </FormComponent>
  );
};

export default HighContrastRadio;
