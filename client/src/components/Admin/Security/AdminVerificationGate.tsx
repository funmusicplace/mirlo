import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "components/common/LoadingSpinner";
import WidthContainer from "components/common/WidthContainer";
import { queryMfaStatus } from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";

import AddAuthenticatorApp from "./AddAuthenticatorApp";
import AddSecurityKey from "./AddSecurityKey";
import VerifySecondFactor from "./VerifySecondFactor";

const AdminVerificationGate: React.FC<{
  onRecoveryCodes: (codes: string[]) => void;
}> = ({ onRecoveryCodes }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const { data: status, isLoading } = useQuery(queryMfaStatus());

  return (
    <WidthContainer variant="small" justify="center">
      <div className="flex flex-col gap-6 py-8">
        <h1>{t("gateTitle")}</h1>
        {isLoading && <LoadingSpinner />}
        {status && !status.hasFactors && (
          <>
            <p>{t("gateIntroSetup")}</p>
            <AddSecurityKey onRecoveryCodes={onRecoveryCodes} />
            <AddAuthenticatorApp onRecoveryCodes={onRecoveryCodes} />
          </>
        )}
        {status?.hasFactors && (
          <>
            <p>{t("gateIntroVerify")}</p>
            <VerifySecondFactor status={status} />
          </>
        )}
      </div>
    </WidthContainer>
  );
};

export default AdminVerificationGate;
