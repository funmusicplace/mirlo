import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { EMAIL_REGEX, isValidEmail } from "utils/email";

import { API_ROOT } from "../../../constants";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const CONTACT_EMAIL_FIELDS = [
  {
    key: "contactEmail",
    id: "contact-email",
    required: true,
    labelKey: "contactEmail",
    hintKey: "contactEmailHint",
    invalidKey: "contactEmailInvalid",
  },
  {
    key: "supportEmail",
    id: "support-email",
    required: false,
    labelKey: "supportEmail",
    hintKey: "supportEmailHint",
    invalidKey: "supportEmailInvalid",
  },
] as const;

const EmailProviderSection: React.FC<{ hideTitle?: boolean }> = ({
  hideTitle,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<FormSettings>();
  const provider = watch("emailProvider.provider");
  const fromEmailError = errors.emailProvider?.fromEmail?.message;

  return (
    <SettingsSection
      id="settings-email"
      title={t("emailSettings")}
      hideTitle={hideTitle}
    >
      <fieldset>
        <legend className="mb-2 text-lg font-bold">
          {t("whereToReachYou")}
        </legend>
        {CONTACT_EMAIL_FIELDS.map(
          ({ key, id, required, labelKey, hintKey, invalidKey }) => {
            const error = errors.instanceCustomization?.[key]?.message;
            return (
              <FormComponent key={key}>
                <label htmlFor={`input-${id}`}>{t(labelKey)}</label>
                <InputEl
                  id={`input-${id}`}
                  type="email"
                  className="max-w-md"
                  required={required}
                  aria-describedby={
                    error ? `hint-${id} error-${id}` : `hint-${id}`
                  }
                  aria-invalid={!!error}
                  {...register(`instanceCustomization.${key}`, {
                    validate: (value) =>
                      (!required && !value?.trim()) ||
                      isValidEmail(value?.trim() ?? "") ||
                      t(invalidKey),
                  })}
                />
                <small id={`hint-${id}`}>{t(hintKey)}</small>
                {error && (
                  <small id={`error-${id}`} className="error">
                    {error}
                  </small>
                )}
              </FormComponent>
            );
          }
        )}
      </fieldset>

      <fieldset aria-describedby="description-outgoing-email">
        <legend className="mb-2 text-lg font-bold">{t("outgoingEmail")}</legend>
        <small id="description-outgoing-email" className="mb-4 block">
          {t("outgoingEmailDescription")}
        </small>
        <FormComponent>
          <label htmlFor="input-email-provider">
            {t("emailProviderLabel")}
          </label>
          <SelectEl
            id="input-email-provider"
            {...register("emailProvider.provider")}
          >
            <option value="">{t("emailProviderNone")}</option>
            <option value="sendgrid">SendGrid</option>
            <option value="mailgun">Mailgun</option>
            <option value="postmark">Postmark</option>
            <option value="smtp">SMTP</option>
          </SelectEl>
        </FormComponent>

        <FormComponent>
          <label htmlFor="input-email-from">{t("emailFrom")}</label>
          <InputEl
            id="input-email-from"
            type="text"
            className="max-w-md"
            aria-describedby={fromEmailError ? "error-email-from" : undefined}
            aria-invalid={!!fromEmailError}
            {...register("emailProvider.fromEmail", {
              pattern: {
                value: EMAIL_REGEX,
                message: t("emailFromInvalid"),
              },
            })}
          />
          {fromEmailError && (
            <small id="error-email-from" className="error">
              {fromEmailError}
            </small>
          )}
        </FormComponent>

        {provider === "sendgrid" && (
          <fieldset>
            <legend className="mb-2 font-semibold">SendGrid</legend>
            <FormComponent>
              <label htmlFor="input-sendgrid-api-key">{t("apiKey")}</label>
              <InputEl
                id="input-sendgrid-api-key"
                type="password"
                className="max-w-md"
                {...register("emailProvider.sendgrid.apiKey")}
              />
            </FormComponent>
            <FormComponent>
              <label htmlFor="input-sendgrid-webhook-public-key">
                {t("sendgridWebhookPublicKey")}
              </label>
              <InputEl
                id="input-sendgrid-webhook-public-key"
                type="text"
                className="max-w-md"
                aria-describedby="hint-sendgrid-webhook-public-key"
                {...register("emailProvider.sendgrid.webhookPublicKey")}
              />
              <small id="hint-sendgrid-webhook-public-key" className="max-w-md">
                {t("sendgridWebhookPublicKeyHint", {
                  url: `${API_ROOT || window.location.origin}/v1/webhooks/sendgrid`,
                })}
              </small>
            </FormComponent>
          </fieldset>
        )}

        {provider === "mailgun" && (
          <fieldset>
            <legend className="mb-2 font-semibold">Mailgun</legend>
            <FormComponent>
              <label htmlFor="input-mailgun-api-key">{t("apiKey")}</label>
              <InputEl
                id="input-mailgun-api-key"
                type="password"
                className="max-w-md"
                {...register("emailProvider.mailgun.apiKey")}
              />
            </FormComponent>
            <FormComponent>
              <label htmlFor="input-mailgun-domain">{t("mailgunDomain")}</label>
              <InputEl
                id="input-mailgun-domain"
                type="text"
                className="max-w-md"
                {...register("emailProvider.mailgun.domain")}
              />
            </FormComponent>
          </fieldset>
        )}

        {provider === "postmark" && (
          <fieldset>
            <legend className="mb-2 font-semibold">Postmark</legend>
            <FormComponent>
              <label htmlFor="input-postmark-api-key">{t("apiKey")}</label>
              <InputEl
                id="input-postmark-api-key"
                type="text"
                className="max-w-md"
                {...register("emailProvider.postmark.apiKey")}
              />
            </FormComponent>
          </fieldset>
        )}

        {provider === "smtp" && (
          <fieldset>
            <legend className="mb-2 font-semibold">SMTP</legend>
            <FormComponent>
              <label htmlFor="input-smtp-host">{t("smtpHost")}</label>
              <InputEl
                id="input-smtp-host"
                type="text"
                className="max-w-md"
                placeholder="smtp.example.com"
                {...register("emailProvider.smtp.host")}
              />
            </FormComponent>
            <FormComponent>
              <label htmlFor="input-smtp-port">{t("smtpPort")}</label>
              <InputEl
                id="input-smtp-port"
                type="number"
                className="max-w-md"
                aria-describedby="hint-smtp-port"
                {...register("emailProvider.smtp.port", {
                  setValueAs: (value) =>
                    value === "" || value === undefined
                      ? undefined
                      : Number(value),
                })}
              />
              <small id="hint-smtp-port">{t("smtpPortHint")}</small>
            </FormComponent>
            <FormComponent direction="row">
              <InputEl
                id="input-smtp-secure"
                type="checkbox"
                aria-describedby="hint-smtp-secure"
                {...register("emailProvider.smtp.secure")}
              />
              <div className="flex flex-col">
                <label htmlFor="input-smtp-secure">{t("smtpSecure")}</label>
                <small id="hint-smtp-secure" className="max-w-md">
                  {t("smtpSecureHint")}
                </small>
              </div>
            </FormComponent>
            <FormComponent>
              <label htmlFor="input-smtp-user">{t("smtpUser")}</label>
              <InputEl
                id="input-smtp-user"
                type="text"
                className="max-w-md"
                autoComplete="off"
                {...register("emailProvider.smtp.user")}
              />
            </FormComponent>
            <FormComponent>
              <label htmlFor="input-smtp-password">{t("smtpPassword")}</label>
              <InputEl
                id="input-smtp-password"
                type="password"
                className="max-w-md"
                autoComplete="new-password"
                {...register("emailProvider.smtp.password")}
              />
            </FormComponent>
          </fieldset>
        )}
      </fieldset>
    </SettingsSection>
  );
};

export default EmailProviderSection;
