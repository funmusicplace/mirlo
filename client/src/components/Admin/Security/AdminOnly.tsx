import React from "react";
import { useAuthContext } from "state/AuthContext";

import AdminVerificationGate from "./AdminVerificationGate";
import RecoveryCodesModal from "./RecoveryCodesModal";

const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(
    null
  );

  return (
    <>
      {user?.isAdmin ? (
        children
      ) : (
        <AdminVerificationGate onRecoveryCodes={setRecoveryCodes} />
      )}
      <RecoveryCodesModal
        codes={recoveryCodes}
        onClose={() => setRecoveryCodes(null)}
      />
    </>
  );
};

export default AdminOnly;
