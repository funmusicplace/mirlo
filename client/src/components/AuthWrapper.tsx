import AdminOnly from "components/Admin/Security/AdminOnly";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

export const AuthWrapper: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const isAdminAccount = !!user?.isAdmin || !!user?.needsAdminVerification;

  React.useEffect(() => {
    if (user === null) {
      navigate("/");
    }
    if (adminOnly && user !== undefined && !isAdminAccount) {
      navigate("/");
    }
  }, [adminOnly, navigate, user, isAdminAccount]);

  if (!user) {
    return null;
  }

  if (adminOnly) {
    return isAdminAccount ? <AdminOnly>{children}</AdminOnly> : null;
  }

  return <>{children}</>;
};
