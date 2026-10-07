import { useInstanceSettings } from "queries/instanceSettings";
import React from "react";
import { Navigate } from "react-router-dom";

const SetupRedirect: React.FC = () => {
  const { setupStage } = useInstanceSettings();

  if (setupStage === "welcome") {
    return <Navigate to="/admin/welcome" replace />;
  }

  return null;
};

export default SetupRedirect;
