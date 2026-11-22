import { useQuery } from "@tanstack/react-query";
import AddSecurityKey from "components/Admin/Security/AddSecurityKey";
import AdminVerificationGate from "components/Admin/Security/AdminVerificationGate";
import AuthenticatorAppSection from "components/Admin/Security/AuthenticatorAppSection";
import RecoveryCodesModal from "components/Admin/Security/RecoveryCodesModal";
import RecoveryCodesSection from "components/Admin/Security/RecoveryCodesSection";
import SecurityKeysList from "components/Admin/Security/SecurityKeysList";
import LoadingSpinner from "components/common/LoadingSpinner";
import WidthContainer from "components/common/WidthContainer";
import { queryMfaStatus } from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const { data: status, isLoading } = useQuery(queryMfaStatus());
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(
    null
  );

  const content = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    if (!status) {
      return null;
    }
    if (!status.verified) {
      return <AdminVerificationGate onRecoveryCodes={setRecoveryCodes} />;
    }
    return (
      <div className="flex flex-col gap-8 py-4">
        <section className="flex flex-col gap-4">
          <h2>{t("securityKeys")}</h2>
          <SecurityKeysList securityKeys={status.securityKeys} />
          <AddSecurityKey onRecoveryCodes={setRecoveryCodes} />
        </section>
        <section className="flex flex-col gap-4">
          <h2>{t("authenticatorApp")}</h2>
          <AuthenticatorAppSection
            totpEnabled={status.totpEnabled}
            onRecoveryCodes={setRecoveryCodes}
          />
        </section>
        {status.hasFactors && (
          <section className="flex flex-col gap-4">
            <h2>{t("recoveryCodes")}</h2>
            <RecoveryCodesSection
              remaining={status.recoveryCodesRemaining}
              onRecoveryCodes={setRecoveryCodes}
            />
          </section>
        )}
      </div>
    );
  };

  return (
    <WidthContainer variant="medium" className="p-4">
      {content()}
      <RecoveryCodesModal
        codes={recoveryCodes}
        onClose={() => setRecoveryCodes(null)}
      />
    </WidthContainer>
  );
};

export default Index;
