import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";

const POLICY_FIELDS = [
  { key: "terms", labelKey: "termsMarkdown" },
  { key: "privacyPolicy", labelKey: "privacyPolicyMarkdown" },
  { key: "cookiePolicy", labelKey: "cookiePolicyMarkdown" },
  { key: "contentPolicy", labelKey: "contentPolicyMarkdown" },
] as const;

const PoliciesSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register } = useFormContext<FormSettings>();

  return (
    <fieldset id="settings-policies" className="mb-8 scroll-mt-32">
      <legend className="mb-4 w-full border-b border-(--mi-tint-x-color) pb-2 text-lg font-semibold">
        {t("policies")}
      </legend>
      {POLICY_FIELDS.map(({ key, labelKey }) => (
        <FormComponent key={key} className="w-full">
          <label htmlFor={`input-${key}`}>{t(labelKey)}</label>
          <TextArea id={`input-${key}`} rows={10} {...register(key)} />
        </FormComponent>
      ))}
    </fieldset>
  );
};

export default PoliciesSection;
