import React from "react";
import { useAuthContext } from "state/AuthContext";

interface FeatureFlagProps {
  featureFlag: "label" | "cataloguePrice" | "activityPub";
  children: React.ReactNode;
}

const FeatureFlag: React.FC<FeatureFlagProps> = ({ featureFlag, children }) => {
  const { user } = useAuthContext();
  const isFeatureEnabled =
    (user?.isAdmin ||
      user?.featureFlags?.find((flag) => flag === featureFlag)) ??
    false;
  return <>{isFeatureEnabled ? children : null}</>;
};

export default FeatureFlag;
