import Button from "components/common/Button";
import {
  TotpSetup,
  useEnableTotpMutation,
  useTotpSetupMutation,
} from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaMobileAlt } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import CodeForm from "./CodeForm";

const AddAuthenticatorApp: React.FC<{
  onRecoveryCodes: (codes: string[]) => void;
}> = ({ onRecoveryCodes }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const snackbar = useSnackbar();
  const [setup, setSetup] = React.useState<TotpSetup | null>(null);
  const { mutateAsync: startSetup, isPending } = useTotpSetupMutation();
  const { mutateAsync: enable } = useEnableTotpMutation();

  const onStart = React.useCallback(async () => {
    try {
      setSetup(await startSetup());
    } catch {
      snackbar(t("setupFailed"), { type: "warning" });
    }
  }, [startSetup, snackbar, t]);

  const onEnable = React.useCallback(
    async (code: string) => {
      try {
        const { recoveryCodes } = await enable(code);
        setSetup(null);
        if (recoveryCodes?.length) {
          onRecoveryCodes(recoveryCodes);
        }
      } catch {
        snackbar(t("codeFailed"), { type: "warning" });
      }
    },
    [enable, onRecoveryCodes, snackbar, t]
  );

  if (!setup) {
    return (
      <div>
        <Button
          type="button"
          startIcon={<FaMobileAlt />}
          onClick={onStart}
          isLoading={isPending}
          disabled={isPending}
        >
          {t("useAuthenticatorApp")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p>{t("scanQrCode")}</p>
      <img
        src={setup.qrCode}
        alt={t("qrCodeAlt")}
        className="w-48 h-48 bg-white p-2"
      />
      <code className="break-all">{setup.secret}</code>
      <a href={setup.otpauthUrl} className="underline">
        {t("openInApp")}
      </a>
      <CodeForm
        id="totp-enable-code"
        label={t("authenticatorCode")}
        submitLabel={t("enableAuthenticator")}
        isOneTimeCode
        onSubmit={onEnable}
      />
    </div>
  );
};

export default AddAuthenticatorApp;
