import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { useRegisterStripeWebhookMutation } from "queries/admin";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const StripeSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch, setValue } = useFormContext<FormSettings>();
  const stripeKeyConfigured = watch("stripe.keyConfigured");
  const webhookEndpointId = watch("stripe.webhookEndpointId");
  const snackbar = useSnackbar();
  const { mutateAsync, isPending } = useRegisterStripeWebhookMutation();

  const registerWebhook = async () => {
    try {
      const { result } = await mutateAsync();
      setValue("stripe.webhookEndpointId", result.webhookEndpointId);
      setValue(
        "stripe.webhookConnectSigningSecret",
        result.webhookConnectSigningSecret
      );
      snackbar(t("stripeWebhookRegistered"), { type: "success" });
    } catch (e) {
      snackbar(t("stripeWebhookRegisterFailed"), { type: "error" });
    }
  };

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
        {webhookEndpointId ? (
          <small>{t("stripeWebhookRegistered")}</small>
        ) : (
          <Button
            type="button"
            variant="outlined"
            className="self-start"
            isLoading={isPending}
            disabled={isPending}
            onClick={registerWebhook}
          >
            {t("stripeWebhookRegister")}
          </Button>
        )}
      </FormComponent>
    </SettingsSection>
  );
};

export default StripeSection;
