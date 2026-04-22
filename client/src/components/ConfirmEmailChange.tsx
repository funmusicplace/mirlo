import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSnackbar } from "../state/SnackbarContext";
import Box from "./common/Box";
import Button from "./common/Button";
import { useTranslation } from "react-i18next";

function ConfirmEmailChange() {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", {
    keyPrefix: "emailConfirmation",
  });
  const [search] = useSearchParams();
  const snackbar = useSnackbar();

  const token = search.get("token");
  const userId = search.get("userId");

  const [isConfirming, setIsConfirming] = React.useState(false);
  const [confirmationError, setConfirmationError] = React.useState<
    string | null
  >(null);
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  const onConfirmEmailChange = React.useCallback(async () => {
    if (!token || !userId) {
      setConfirmationError(t("invalidLink"));
      return;
    }

    setIsConfirming(true);
    try {
      await api.post(`users/${userId}/confirmEmailChange`, {
        token,
      });
      snackbar(t("confirmed"), { type: "success" });
      setIsConfirmed(true);
      setTimeout(() => {
        navigate("/profile");
      }, 3000);
    } catch (e: unknown) {
      const errorMessage = (e as Error).message || t("confirmationFailed");
      setConfirmationError(errorMessage);
      console.error(e);
    } finally {
      setIsConfirming(false);
    }
  }, [token, userId, t, snackbar, navigate]);

  React.useEffect(() => {
    onConfirmEmailChange();
  }, [onConfirmEmailChange]);

  return (
    <div className="max-w-md mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">{t("confirmed")}</h2>

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

      {!isConfirming && confirmationError && (
        <Button onClick={onConfirmEmailChange} className="mt-4">
          {t("tryAgain")}
        </Button>
      )}
    </div>
  );
}

export default ConfirmEmailChange;
