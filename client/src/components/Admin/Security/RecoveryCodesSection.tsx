import Button from "components/common/Button";
import { useRegenerateRecoveryCodesMutation } from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { useConfirm } from "utils/useConfirm";

import { useMfaErrorHandler } from "./useMfaErrorHandler";

const RecoveryCodesSection: React.FC<{
  remaining: number;
  onRecoveryCodes: (codes: string[]) => void;
}> = ({ remaining, onRecoveryCodes }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const { ask } = useConfirm();
  const onError = useMfaErrorHandler();
  const { mutateAsync: regenerate, isPending } =
    useRegenerateRecoveryCodesMutation();

  const onRegenerate = async () => {
    if (!(await ask(t("confirmRegenerate")))) {
      return;
    }
    try {
      const { recoveryCodes } = await regenerate();
      onRecoveryCodes(recoveryCodes);
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p>{t("recoveryCodesRemaining", { count: remaining })}</p>
      <Button
        type="button"
        size="compact"
        variant="outlined"
        onClick={onRegenerate}
        isLoading={isPending}
        disabled={isPending}
      >
        {t("regenerateRecoveryCodes")}
      </Button>
    </div>
  );
};

export default RecoveryCodesSection;
