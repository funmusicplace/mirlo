import { startAuthentication } from "@simplewebauthn/browser";
import Button from "components/common/Button";
import {
  fetchAuthenticationOptions,
  MfaStatus,
  useAuthenticateSecurityKeyMutation,
  useRedeemRecoveryCodeMutation,
  useVerifyTotpMutation,
} from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaKey } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import CodeForm from "./CodeForm";

const VerifySecondFactor: React.FC<{ status: MfaStatus }> = ({ status }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const snackbar = useSnackbar();
  const [isWorking, setIsWorking] = React.useState(false);
  const [showRecovery, setShowRecovery] = React.useState(false);
  const { mutateAsync: authenticate } = useAuthenticateSecurityKeyMutation();
  const { mutateAsync: verifyTotp } = useVerifyTotpMutation();
  const { mutateAsync: redeemRecoveryCode } = useRedeemRecoveryCodeMutation();

  const onSecurityKey = React.useCallback(async () => {
    setIsWorking(true);
    try {
      const optionsJSON = await fetchAuthenticationOptions();
      await authenticate(await startAuthentication({ optionsJSON }));
    } catch {
      snackbar(t("securityKeyFailed"), { type: "warning" });
    } finally {
      setIsWorking(false);
    }
  }, [authenticate, snackbar, t]);

  const onTotp = React.useCallback(
    async (code: string) => {
      try {
        await verifyTotp(code);
      } catch {
        snackbar(t("codeFailed"), { type: "warning" });
      }
    },
    [verifyTotp, snackbar, t]
  );

  const onRecovery = React.useCallback(
    async (code: string) => {
      try {
        const { recoveryCodesRemaining } = await redeemRecoveryCode(code);
        snackbar(
          t("recoveryCodesRemaining", { count: recoveryCodesRemaining }),
          { type: "success" }
        );
      } catch {
        snackbar(t("codeFailed"), { type: "warning" });
      }
    },
    [redeemRecoveryCode, snackbar, t]
  );

  return (
    <div className="flex flex-col gap-6">
      {status.securityKeys.length > 0 && (
        <div>
          <Button
            type="button"
            buttonRole="primary"
            startIcon={<FaKey />}
            onClick={onSecurityKey}
            isLoading={isWorking}
            disabled={isWorking}
          >
            {t("verifyWithSecurityKey")}
          </Button>
        </div>
      )}
      {status.totpEnabled && (
        <CodeForm
          id="totp-verify-code"
          label={t("authenticatorCode")}
          submitLabel={t("verifyCode")}
          isOneTimeCode
          onSubmit={onTotp}
        />
      )}
      {showRecovery ? (
        <CodeForm
          id="recovery-code"
          label={t("recoveryCode")}
          submitLabel={t("verifyCode")}
          onSubmit={onRecovery}
        />
      ) : (
        <div>
          <Button
            type="button"
            variant="link"
            onClick={() => setShowRecovery(true)}
          >
            {t("useRecoveryCode")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VerifySecondFactor;
