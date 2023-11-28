import React from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const {
    state: { user },
  } = useGlobalStateContext();

  React.useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
