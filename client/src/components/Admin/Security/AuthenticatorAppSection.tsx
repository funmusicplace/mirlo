import Button from "components/common/Button";
import { useDisableTotpMutation } from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { useConfirm } from "utils/useConfirm";

import AddAuthenticatorApp from "./AddAuthenticatorApp";
import { useMfaErrorHandler } from "./useMfaErrorHandler";

const AuthenticatorAppSection: React.FC<{
  totpEnabled: boolean;
  onRecoveryCodes: (codes: string[]) => void;
}> = ({ totpEnabled, onRecoveryCodes }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const { ask } = useConfirm();
  const onError = useMfaErrorHandler();
  const { mutateAsync: disableTotp, isPending } = useDisableTotpMutation();

  const onDisable = async () => {
    if (!(await ask(t("confirmDisableAuthenticator")))) {
      return;
    }
    try {
      await disableTotp();
    } catch (e) {
      onError(e);
    }
  };

  if (!totpEnabled) {
    return (
      <>
        <p>{t("authenticatorOff")}</p>
        <AddAuthenticatorApp onRecoveryCodes={onRecoveryCodes} />
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p>{t("authenticatorOn")}</p>
      <Button
        type="button"
        size="compact"
        variant="outlined"
        onClick={onDisable}
        isLoading={isPending}
        disabled={isPending}
      >
        {t("disableAuthenticator")}
      </Button>
    </div>
  );
};

export default AuthenticatorAppSection;
