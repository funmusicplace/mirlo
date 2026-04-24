import { css } from "@emotion/css";
import { Turnstile } from "@marsidev/react-turnstile";
import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import { queryInstanceArtist } from "queries/settings";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { APIResponseError } from "services/APIInstance";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

import { SplashTitle } from "./Splash";

const containerStyles = css`
  width: 100%;
  background-color: color-mix(
    in srgb,
    var(--mi-normal-foreground-color) 6%,
    var(--mi-normal-background-color)
  );
  display: flex;
  justify-content: center;
  padding: 7rem 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: 3rem 1.5rem;
  }
`;

const innerStyles = css`
  width: min(100%, var(--mi-container-big));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const NewsletterSignup: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });
  const snackbar = useSnackbar();
  const [email, setEmail] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const codeInputRef = React.useRef<HTMLInputElement>(null);
  const turnstileSiteKey = import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY;
  const { data: instanceArtist, isPending } = useQuery(queryInstanceArtist());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !instanceArtist?.id || isSubmitting) return;

    if (turnstileSiteKey) {
      setStep(1);
      setModalOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("verify-email", { email });
      setStep(2);
      setModalOpen(true);
    } catch {
      snackbar(t("newsletterError"), { type: "warning" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTurnstileSuccess = async (token: string) => {
    try {
      await api.post("verify-email", { email, cfTurnstile: token });
      setStep(2);
    } catch {
      snackbar(t("newsletterError"), { type: "warning" });
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCode("");
    setStep(1);
    setVerifyError(null);
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim() || isVerifying || !instanceArtist?.id) return;

    try {
      setIsVerifying(true);
      setVerifyError(null);
      const response = await api.post<
        { email: string; code: string },
        { userId: string }
      >("verify-email", { code: code.trim(), email });

      if (!response.userId) {
        setVerifyError(t("newsletterInvalidCode"));
        return;
      }

      await api.post(`artists/${instanceArtist.id}/follow`, { email });

      snackbar(t("newsletterSuccess"), { type: "success" });
      setModalOpen(false);
      setEmail("");
      setCode("");
      setStep(1);
    } catch (error) {
      if (error instanceof APIResponseError && error.status === 400) {
        setVerifyError(t("newsletterInvalidCode"));
      } else {
        setVerifyError(t("newsletterError"));
      }
      codeInputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    try {
      setIsResending(true);
      await api.post("verify-email", { email });
      snackbar(t("newsletterResendSuccess"), { type: "success" });
    } catch {
      snackbar(t("newsletterError"), { type: "warning" });
    } finally {
      setIsResending(false);
    }
  };

  if (!instanceArtist && !isPending) {
    return null;
  }

  const modalTitle =
    step === 1 ? t("newsletterVerifyingTitle") : t("newsletterCheckInbox");

  return (
    <section className={containerStyles}>
      <div className={innerStyles}>
        <div className="flex flex-col gap-3 max-w-[420px]">
          <SplashTitle as="h2">{t("mailingList")}</SplashTitle>
          <p className="text-(--mi-light-foreground-color) leading-[1.6]">
            {t("newsletterDescription")}
          </p>
        </div>
        <div className="bg-(--mi-normal-background-color) border border-(--mi-darken-x-background-color) rounded-[var(--mi-border-radius-x)] p-8 flex-1 max-w-[460px] max-md:max-w-full max-md:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label
              htmlFor="input-newsletter-email"
              className="text-sm font-medium text-(--mi-normal-foreground-color)"
            >
              {t("newsletterEmailLabel")}
            </label>
            <InputEl
              id="input-newsletter-email"
              type="email"
              required
              value={email}
              placeholder={t("newsletterPlaceholder")}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!email.trim() || !instanceArtist?.id || isSubmitting}
              size="big"
              className="w-full justify-center mt-1"
            >
              {t("newsletterButton")}
            </Button>
          </form>
        </div>
      </div>
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={modalTitle}
        size="small"
        focusTrapOptions={{ delayInitialFocus: true }}
      >
        {step === 1 && turnstileSiteKey ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--mi-light-foreground-color)">
              {t("newsletterVerifyingDescription")}
            </p>
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={handleTurnstileSuccess}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--mi-light-foreground-color)">
              {t("newsletterCodeSentTo", { email })}
            </p>
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <FormComponent>
                <label htmlFor="input-newsletter-code">
                  {t("newsletterEnterCode")}
                </label>
                <InputEl
                  id="input-newsletter-code"
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setVerifyError(null);
                  }}
                />
              </FormComponent>
              <p
                role="alert"
                aria-atomic="true"
                className="text-sm text-(--mi-red-700)"
              >
                {verifyError}
              </p>
              <Button
                type="submit"
                isLoading={isVerifying}
                disabled={!code.trim() || isVerifying}
                className="w-full justify-center"
              >
                {t("newsletterVerifyAndSubscribe")}
              </Button>
            </form>
            <Button
              type="button"
              variant="link"
              size="compact"
              isLoading={isResending}
              disabled={isResending}
              onClick={handleResend}
            >
              {t("newsletterResend")}
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default NewsletterSignup;
