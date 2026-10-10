import Box from "components/common/Box";
import Button from "components/common/Button";
import { SetupStatus } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import SetupChecklist from "./SetupChecklist";

const SystemCheckStep: React.FC<{
  status?: SetupStatus;
  hasError: boolean;
  isChecking: boolean;
  onRerun: () => void;
}> = ({ status, hasError, isChecking, onRerun }) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });

  return (
    <>
      {hasError ? (
        <Box variant="warning">{t("systemCheck.error")}</Box>
      ) : status ? (
        <SetupChecklist checks={status.checks} />
      ) : (
        <p>{t("systemCheck.loading")}</p>
      )}
      <div className="mt-4">
        <Button
          type="button"
          variant="transparent"
          isLoading={isChecking}
          onClick={onRerun}
        >
          {t("systemCheck.rerun")}
        </Button>
      </div>
    </>
  );
};

export default SystemCheckStep;
