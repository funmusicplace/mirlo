import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

export const AuthWrapper: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  React.useEffect(() => {
    if (!user) {
      navigate("/");
    }
    if (adminOnly && !user?.isAdmin) {
      navigate("/");
    }
  }, [adminOnly, navigate, user]);

  if (!user) {
    return null;
  }

  if (adminOnly && !user.isAdmin) {
    return null;
  }

  return <>{children}</>;
};
