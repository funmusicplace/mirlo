import Box from "components/common/Box";
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

const SECRET_KEY_MODE_REGEX = /^(?:sk|rk)_(test|live)_/;

const PUBLISHABLE_KEY_MODE_REGEX = /^pk_(test|live)_/;

const STRIPE_KEY_TYPE_NAMES = { test: "test key", live: "live key" } as const;

const STRIPE_KEYS_HELP_URL =
  "https://support.stripe.com/questions/what-are-stripe-api-keys-and-how-to-find-them";

const StripeSection: React.FC<{
  hideTitle?: boolean;
  saveKey: () => Promise<void>;
}> = ({ hideTitle, saveKey }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch, setValue, getFieldState, formState } =
    useFormContext<FormSettings>();
  const stripeKeyConfigured = watch("stripe.keyConfigured");
  const typedKey = watch("stripe.key")?.trim();
  const savedKeyMode = watch("stripe.keyMode");
  const publishableKey = watch("stripe.publishableKey")?.trim();
  const isKeyUnsaved = getFieldState("stripe.key", formState).isDirty;
  const secretKeyMode = typedKey
    ? typedKey.match(SECRET_KEY_MODE_REGEX)?.[1]
    : savedKeyMode;
  const publishableKeyMode = publishableKey?.match(
    PUBLISHABLE_KEY_MODE_REGEX
  )?.[1];
  const hasKeyModeMismatch = Boolean(
    secretKeyMode && publishableKeyMode && secretKeyMode !== publishableKeyMode
  );
  const webhookEndpointId = watch("stripe.webhookEndpointId");
  const webhookSecretConfigured = watch("stripe.webhookSecretConfigured");
  const snackbar = useSnackbar();
  const { mutateAsync } = useRegisterStripeWebhookMutation();
  const [isRegistering, setIsRegistering] = React.useState(false);

  const registerWebhook = async () => {
    setIsRegistering(true);
    try {
      if (isKeyUnsaved) {
        await saveKey();
      }
      const { result } = await mutateAsync();
      setValue("stripe.webhookEndpointId", result.webhookEndpointId);
      setValue("stripe.webhookSecretConfigured", true);
      snackbar(
        webhookEndpointId
          ? t("stripeWebhookSynced")
          : t("stripeWebhookRegistered"),
        { type: "success" }
      );
    } catch (e) {
      snackbar(t("stripeWebhookRegisterFailed"), { type: "error" });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SettingsSection
      id="settings-stripe"
      title={t("stripeSettings")}
      hideTitle={hideTitle}
    >
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
          aria-describedby="hint-stripe-key"
          {...register("stripe.key")}
        />
        <small id="hint-stripe-key">
          <a href={STRIPE_KEYS_HELP_URL} target="_blank" rel="noreferrer">
            {t("stripeKeysLearnMore")}
          </a>
        </small>
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-stripe-publishable-key">
          {t("stripePublishableKey")}
        </label>
        <InputEl
          id="input-stripe-publishable-key"
          type="text"
          className="max-w-md"
          placeholder="pk_..."
          aria-describedby={
            hasKeyModeMismatch
              ? "hint-stripe-publishable-key warning-stripe-key-mode"
              : "hint-stripe-publishable-key"
          }
          {...register("stripe.publishableKey")}
        />
        <small id="hint-stripe-publishable-key">
          {t("stripePublishableKeyDescription")}
        </small>
        {hasKeyModeMismatch && (
          <Box id="warning-stripe-key-mode" variant="warning">
            {t("stripeKeyModeMismatch", {
              secretKeyType:
                STRIPE_KEY_TYPE_NAMES[secretKeyMode as "test" | "live"],
              publishableKeyType:
                STRIPE_KEY_TYPE_NAMES[publishableKeyMode as "test" | "live"],
            })}
          </Box>
        )}
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-stripe-webhook-connect-signing-secret">
          {t("stripeWebhookConnectSigningSecret")}
        </label>
        <InputEl
          id="input-stripe-webhook-connect-signing-secret"
          type="password"
          className="max-w-md"
          placeholder={
            webhookSecretConfigured
              ? t("stripeWebhookSecretPlaceholderConfigured")
              : t("stripeWebhookSecretPlaceholderEmpty")
          }
          aria-describedby="hint-stripe-webhook-connect-signing-secret"
          {...register("stripe.webhookConnectSigningSecret")}
        />
        <small id="hint-stripe-webhook-connect-signing-secret">
          {t("stripeWebhookSecretHint")}
        </small>
        {webhookEndpointId && <small>{t("stripeWebhookRegistered")}</small>}
        <Button
          type="button"
          variant="outlined"
          className="self-start"
          isLoading={isRegistering}
          disabled={isRegistering}
          onClick={registerWebhook}
        >
          {webhookEndpointId
            ? t("stripeWebhookSync")
            : t("stripeWebhookRegister")}
        </Button>
      </FormComponent>
    </SettingsSection>
  );
};

export default StripeSection;
