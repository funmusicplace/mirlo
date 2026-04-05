import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import Box from "./common/Box";
import Button from "./common/Button";

function EmailConfirmation() {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", {
    keyPrefix: "emailConfirmation",
  });
  const [search] = useSearchParams();

  const { token, userId, client, accountType, email, error } = React.useMemo(
    () => ({
      token: search.get("token"),
      userId: search.get("id"),
      client: search.get("client"),
      accountType: search.get("accountType") as "artist" | "listener" | null,
      email: search.get("email"),
      error: search.get("error"),
    }),
    [search]
  );

  const snackbar = useSnackbar();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [confirmationError, setConfirmationError] = React.useState<
    string | null
  >(error);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const [isTokenExpired, setIsTokenExpired] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCountdown, setResendCountdown] = React.useState(30);

  const onConfirmEmail = React.useCallback(async () => {
    if (!token || !userId || !client) {
      setConfirmationError(t("invalidLink"));
      return;
    }

    setIsConfirming(true);
    try {
      await api.post("confirm-email-token", {
        token,
        userId: Number(userId),
        client: Number(client),
        accountType,
      });
      snackbar(t("confirmed"), { type: "success" });
      setIsConfirmed(true);
      setTimeout(() => {
        navigate(accountType === "artist" ? "/manage/" : "/profile/collection");
      }, 3000);
    } catch (e: unknown) {
      const errorMessage = (e as Error).message || t("confirmationFailed");
      setConfirmationError(errorMessage);
      // Check if it's a token expired error
      if (errorMessage.includes("Token expired")) {
        setIsTokenExpired(true);
      }
      snackbar(errorMessage, { type: "warning" });
      console.error(e);
    } finally {
      setIsConfirming(false);
    }
  }, [token, userId, client, accountType]);

  const onResendEmail = React.useCallback(async () => {
    if (!email) {
      snackbar(t("invalidLink"), { type: "warning" });
      return;
    }

    setIsResending(true);
    setResendCountdown(30);
    try {
      await api.post("resend-verification-email", {
        email,
        client: window.location.origin,
        accountType,
      });
      snackbar(t("emailResent"), { type: "success" });
      setConfirmationError(null);
      setIsTokenExpired(false);
    } catch (e: unknown) {
      const errorMessage = (e as Error).message || t("resendFailed");
      snackbar(errorMessage, { type: "warning" });
      console.error(e);
    } finally {
      setIsResending(false);
    }
  }, [email, client, accountType, snackbar, t]);

  // Countdown timer for resend button
  React.useEffect(() => {
    if (!isTokenExpired || isResending) return;

    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isTokenExpired, isResending, resendCountdown]);

  React.useEffect(() => {
    if (token && userId && client && !error) {
      onConfirmEmail();
    }
  }, [token, userId, client, error, onConfirmEmail]); // excluding onConfirmEmail but not sure why it's getting re-created. FIXME.

  return (
    <div className="flex flex-col max-w-sm mx-auto my-12 text-center">
      <h2>{t("title")}</h2>

      {confirmationError && (
        <Box variant="warning" className="mt-4">
          {confirmationError}
        </Box>
      )}

      {isConfirmed && (
        <Box variant="info" className="mt-4">
          {t("redirecting")}
        </Box>
      )}

      {isConfirming && !confirmationError && (
        <div className="mt-4">
          <p>{t("confirming")}</p>
          <div className="inline-block w-[30px] h-[30px] border-4 border-[var(--mi-disable-background-color)] border-t-[var(--mi-foreground-color)] rounded-full animate-spin mx-auto my-4" />
        </div>
      )}

      {!isConfirming && confirmationError && !isTokenExpired && (
        <Button onClick={onConfirmEmail} className="mt-4">
          {t("tryAgain")}
        </Button>
      )}

      {isTokenExpired && (
        <div className="mt-4 flex flex-col items-center">
          <Button
            onClick={onResendEmail}
            disabled={isResending || resendCountdown > 0}
            className="mt-4"
          >
            {resendCountdown > 0
              ? `${t("resendEmail")} (${resendCountdown}s)`
              : t("resendEmail")}
          </Button>
        </div>
      )}

      <img
        alt="a blackbird"
        src="/static/images/blackbird.png"
        className="w-1/2 py-8 mx-auto my-12"
      />
    </div>
  );
}

export default EmailConfirmation;
