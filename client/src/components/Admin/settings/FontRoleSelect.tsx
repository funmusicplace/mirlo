import Box from "components/common/Box";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import { getFinishedLanguages } from "i18n";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ensureFontFaces } from "utils/fonts";

import { hasRegularStyle, languagesMissingFromFont } from "./fontLibrary";
import { FONT_ROLE_FIELDS, FontRole, FormSettings } from "./settingsForm";

const ROLE_TEXTS = {
  heading: {
    labelKey: "headingFont",
    hintKey: "headingFontHint",
    defaultKey: "defaultHeadingFont",
    defaultStack: '"Cubano", system-ui, sans-serif',
  },
  body: {
    labelKey: "bodyFont",
    hintKey: "bodyFontHint",
    defaultKey: "defaultBodyFont",
    defaultStack: "system-ui, sans-serif",
  },
} as const;

const FontRoleSelect: React.FC<{
  role: FontRole;
  fonts: Font[];
  previewText: string;
}> = ({ role, fonts, previewText }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch } = useFormContext<FormSettings>();
  const field = FONT_ROLE_FIELDS[role];
  const texts = ROLE_TEXTS[role];
  const selectedId = watch(field);
  const selected = fonts.find((font) => font.id === selectedId);
  const id = `${role}-font`;
  const missingLanguages =
    role === "body" && selected
      ? languagesMissingFromFont(selected, getFinishedLanguages())
      : [];
  const warnings = [
    role === "body" &&
      selected &&
      !hasRegularStyle(selected) &&
      t("fontNoRegularWarning"),
    missingLanguages.length > 0 &&
      t("fontMissingLanguagesWarning", {
        languages: missingLanguages.map((language) => language.name).join(", "),
      }),
  ].filter((warning): warning is string => Boolean(warning));

  React.useEffect(() => {
    if (selected) {
      ensureFontFaces(selected);
    }
  }, [selected]);

  return (
    <FormComponent>
      <label htmlFor={`input-${id}`}>{t(texts.labelKey)}</label>
      <SelectEl
        id={`input-${id}`}
        aria-describedby={`hint-${id}`}
        {...register(field)}
      >
        <option value="">{t(texts.defaultKey)}</option>
        {fonts.map((font) => (
          <option key={font.id} value={font.id}>
            {font.name}
          </option>
        ))}
      </SelectEl>
      <small id={`hint-${id}`}>{t(texts.hintKey)}</small>
      <div
        role="group"
        aria-labelledby={`preview-label-${id}`}
        className="flex w-full flex-col gap-1 rounded-(--mi-border-radius) bg-(--mi-tint-color) px-3 py-2"
      >
        <span
          id={`preview-label-${id}`}
          className="text-xs tracking-wide text-(--mi-light-foreground-color) uppercase"
        >
          {t("fontPreview")}
        </span>
        <p
          className="m-0 text-xl"
          style={{
            fontFamily: selected ? selected.stack : texts.defaultStack,
          }}
        >
          {previewText}
        </p>
      </div>
      <div role="status" className="w-full">
        {warnings.length > 0 && (
          <Box variant="warning">
            {warnings.map((warning) => (
              <p key={warning} className="m-0">
                {warning}
              </p>
            ))}
          </Box>
        )}
      </div>
    </FormComponent>
  );
};

export default FontRoleSelect;
