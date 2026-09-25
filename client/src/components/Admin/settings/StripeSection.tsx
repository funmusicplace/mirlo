import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const StripeSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch } = useFormContext<FormSettings>();
  const stripeKeyConfigured = watch("stripe.keyConfigured");

  return (
    <SettingsSection id="settings-stripe" title={t("stripeSettings")}>
      <FormComponent>
        <label htmlFor="input-stripe-key">{t("stripeSecretKey")}</label>
        <InputEl
          id="input-stripe-key"
          type="password"
          className="max-w-md"
          placeholder={
            stripeKeyConfigured
              ? t("stripeKeyPlaceholderConfigured")
              : t("stripeKeyPlaceholderEmpty")
          }
          {...register("stripe.key")}
        />
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-stripe-webhook-connect-signing-secret">
          {t("stripeWebhookConnectSigningSecret")}
        </label>
        <InputEl
          id="input-stripe-webhook-connect-signing-secret"
          type="text"
          className="max-w-md"
          {...register("stripe.webhookConnectSigningSecret")}
        />
      </FormComponent>
    </SettingsSection>
  );
};

export default StripeSection;
