import React from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";

export const AuthWrapper: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
}> = ({ children, adminOnly }) => {
  const navigate = useNavigate();
  const {
    state: { user },
  } = useGlobalStateContext();

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
