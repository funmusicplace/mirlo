import { css } from "@emotion/css";
import { SplashTitle } from "./Splash";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import Button from "components/common/Button";
import { bp } from "../../constants";
import api from "services/api";
import { useQuery } from "@tanstack/react-query";
import { queryInstanceArtist } from "queries/settings";
import EmailVerification from "components/common/EmailVerification";
import { Turnstile } from "@marsidev/react-turnstile";

type TurnstileGlobal = {
  reset: (container?: string | HTMLElement) => void;
};

const containerStyles = css`
  width: 100%;
  background-color: var(--mi-light-background-color);
  display: flex;
  justify-content: center;
  padding: 4rem 1rem;

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
    text-align: left;
  }
`;

const copyStyles = css`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 420px;

  p {
    color: var(--mi-light-foreground-color);
    line-height: 1.5;
  }
`;

const formStyles = css`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;

    @media screen and (max-width: ${bp.medium}px) {
      align-items: stretch;
    }
  }
`;

const helperTextStyles = css`
  color: var(--mi-normal-foreground-color);
  font-size: 0.85rem;
`;

const verificationStyles = css`
  margin-top: 1rem;
  width: 100%;

  @media screen and (max-width: ${bp.medium}px) {
    margin-top: 0.75rem;
  }
`;

const turnstileStyles = css`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const turnstileRowStyles = css`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const verifiedEmailStyles = css`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--mi-normal-foreground-color);
`;

const NewsletterSignup: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });
  const snackbar = useSnackbar();
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null);
  const [verifiedEmailDisplay, setVerifiedEmailDisplay] = React.useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
    null
  );
  const [verificationKey, setVerificationKey] = React.useState(0);
  const { data: instanceArtist, isLoading } = useQuery(queryInstanceArtist());
  const turnstileSiteKey = import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY;

  const handleVerifiedEmail = React.useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setVerifiedEmail(trimmed.toLowerCase());
    setVerifiedEmailDisplay(trimmed);
  }, []);

  const handleResetVerification = React.useCallback(() => {
    setVerifiedEmail(null);
    setVerifiedEmailDisplay(null);
    setVerificationKey((current) => current + 1);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!verifiedEmail || isSubmitting) {
      return;
    }

    if (!verifiedEmail) {
      snackbar(t("newsletterVerificationRequired"), { type: "warning" });
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      snackbar(t("newsletterCaptchaRequired"), { type: "warning" });
      return;
    }

    try {
      setIsSubmitting(true);
      const cfTurnstile = turnstileSiteKey ? turnstileToken ?? undefined : undefined;

      await api.post("newsletter", {
        email: verifiedEmail,
        ...(cfTurnstile ? { cfTurnstile } : {}),
      });
      if (turnstileSiteKey && typeof window !== "undefined") {
        try {
          (
            window as typeof window & {
              turnstile?: TurnstileGlobal;
            }
          ).turnstile?.reset();
        } catch (error) {
          console.error(error);
        }
      }
      setTurnstileToken(null);
      snackbar(t("newsletterSuccess"), { type: "success" });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("newsletterError");
      snackbar(message, { type: "warning" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasVerifiedEmail = Boolean(verifiedEmail);

  if (!instanceArtist && !isLoading) {
    return null;
  }

  return (
    <section className={containerStyles}>
      <div className={innerStyles}>
        <div className={copyStyles}>
          <SplashTitle as="h2">{t("mailingList")}</SplashTitle>
          <p>{t("newsletterDescription")}</p>
        </div>
        <div className={formStyles}>
          <form onSubmit={handleSubmit}>
            <div className={turnstileRowStyles}>
              {turnstileSiteKey ? (
                <div className={turnstileStyles}>
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                  />
                </div>
              ) : null}
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={
                  !hasVerifiedEmail ||
                  isSubmitting ||
                  (Boolean(turnstileSiteKey) && !turnstileToken)
                }
              >
                {t("newsletterButton")}
              </Button>
            </div>
            {!hasVerifiedEmail ? (
              <small className={helperTextStyles}>
                {t("newsletterVerificationHint")}
              </small>
            ) : (
              <div className={verifiedEmailStyles}>
                <span>
                  {t("newsletterVerifiedEmail", {
                    email: verifiedEmailDisplay ?? verifiedEmail,
                  })}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="compact"
                  onClick={handleResetVerification}
                >
                  {t("newsletterChangeEmail")}
                </Button>
              </div>
            )}
          </form>
          {!hasVerifiedEmail ? (
            <div className={verificationStyles}>
              <EmailVerification
                key={verificationKey}
                setVerifiedEmail={handleVerifiedEmail}
                smallText="newsletterVerificationInfo"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default NewsletterSignup;
