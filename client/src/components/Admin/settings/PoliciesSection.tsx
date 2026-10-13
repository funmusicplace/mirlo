import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import contentPolicyTemplate from "./policyTemplates/contentPolicy.md?raw";
import cookiePolicyTemplate from "./policyTemplates/cookiePolicy.md?raw";
import privacyPolicyTemplate from "./policyTemplates/privacyPolicy.md?raw";
import termsTemplate from "./policyTemplates/terms.md?raw";
import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const POLICY_FIELDS = [
  {
    key: "terms",
    labelKey: "termsMarkdown",
    template: termsTemplate,
    noticeKey: "termsTemplateLicense",
  },
  {
    key: "privacyPolicy",
    labelKey: "privacyPolicyMarkdown",
    template: privacyPolicyTemplate,
    noticeKey: "privacyPolicyTemplateLicense",
  },
  {
    key: "cookiePolicy",
    labelKey: "cookiePolicyMarkdown",
    template: cookiePolicyTemplate,
    noticeKey: "cookiePolicyTemplateLicense",
  },
  {
    key: "contentPolicy",
    labelKey: "contentPolicyMarkdown",
    template: contentPolicyTemplate,
    noticeKey: "contentPolicyTemplateCredit",
  },
] as const;

type PolicyKey = (typeof POLICY_FIELDS)[number]["key"];

const POLICY_KEYS = POLICY_FIELDS.map(({ key }) => key);

const MISSING_INSTANCE_NAME = "[INSTANCE NAME]";

const MISSING_CONTACT_EMAIL = "[CONTACT EMAIL]";

const TEMPLATE_PLACEHOLDERS = [
  MISSING_INSTANCE_NAME,
  MISSING_CONTACT_EMAIL,
  "[LEGAL ENTITY NAME]",
  "[POSTAL ADDRESS]",
  "[JURISDICTION]",
  "[COURTS]",
  "[LIABILITY CAP]",
  "[PAYMENT PROVIDER]",
  "[HOSTING PROVIDER]",
  "[EMAIL PROVIDER]",
];

const PoliciesSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { control, register, getValues, setValue, setFocus } =
    useFormContext<FormSettings>();
  const policies = useWatch({ control, name: POLICY_KEYS });

  const fillFromTemplate = (key: PolicyKey, template: string) => {
    const instanceName =
      getValues("instanceCustomization.title")?.trim() || MISSING_INSTANCE_NAME;
    const contactEmail =
      getValues("instanceCustomization.supportEmail")?.trim() ||
      MISSING_CONTACT_EMAIL;
    setValue(
      key,
      template
        .replaceAll("{{instanceName}}", () => instanceName)
        .replaceAll("{{contactEmail}}", () => contactEmail),
      { shouldDirty: true }
    );
    setFocus(key);
  };

  return (
    <SettingsSection id="settings-policies" title={t("policies")}>
      {POLICY_FIELDS.map(({ key, labelKey, template, noticeKey }, index) => {
        const value = policies[index] ?? "";
        const hasPlaceholders = TEMPLATE_PLACEHOLDERS.some((placeholder) =>
          value.includes(placeholder)
        );
        return (
          <FormComponent key={key} className="w-full">
            <label htmlFor={`input-${key}`}>{t(labelKey)}</label>
            <TextArea
              id={`input-${key}`}
              rows={10}
              aria-describedby={
                hasPlaceholders ? `hint-${key}-placeholders` : undefined
              }
              {...register(key)}
            />
            {hasPlaceholders && (
              <small id={`hint-${key}-placeholders`}>
                {t("templateBracketsHint")}
              </small>
            )}
            {!value.trim() && (
              <div className="mt-2 flex flex-col items-start gap-1">
                <Button
                  type="button"
                  variant="outlined"
                  size="compact"
                  aria-describedby={`hint-${key}-template`}
                  onClick={() => fillFromTemplate(key, template)}
                >
                  {t("startFromTemplate")}
                </Button>
                <small id={`hint-${key}-template`}>{t(noticeKey)}</small>
              </div>
            )}
          </FormComponent>
        );
      })}
    </SettingsSection>
  );
};

export default PoliciesSection;
