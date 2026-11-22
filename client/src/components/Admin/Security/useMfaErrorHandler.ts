import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

export function useMfaErrorHandler() {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const snackbar = useSnackbar();
  const { refreshLoggedInUser } = useAuthContext();

  return React.useCallback(
    (e: unknown) => {
      if (e instanceof MirloFetchError && e.status === 403) {
        snackbar(t("verifyAgain"), { type: "warning" });
        refreshLoggedInUser();
        return;
      }
      snackbar(t("somethingWentWrong"), { type: "warning" });
    },
    [snackbar, refreshLoggedInUser, t]
  );
}
