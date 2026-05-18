import React from "react";
import { useAuthContext } from "state/AuthContext";

interface FeatureFlagProps {
  flag: "zipUpload" | "federatedStreaming";
  children: React.ReactNode;
}

export const checkIfFeatureEnabled = (
  user: LoggedInUser | null,
  flag: FeatureFlagProps["flag"]
): boolean => {
  return (
    (user?.isAdmin || !!user?.featureFlags?.find((f) => f === flag)) ?? false
  );
};

const FeatureFlag: React.FC<FeatureFlagProps> = ({ flag, children }) => {
  const { user } = useAuthContext();
  const isFeatureEnabled = checkIfFeatureEnabled(user ?? null, flag);
  return <>{isFeatureEnabled ? children : null}</>;
};

export default FeatureFlag;
