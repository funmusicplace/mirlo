import React from "react";
import { useAuthContext } from "state/AuthContext";

interface FeatureFlagProps {
  featureFlag: "activityPub" | "subscriptionFulfillment" | "fundraiser";
  children: React.ReactNode;
}

export const checkIfFeatureEnabled = (
  user: LoggedInUser | null,
  featureFlag: FeatureFlagProps["featureFlag"]
): boolean => {
  return (
    (user?.isAdmin ||
      !!user?.featureFlags?.find((flag) => flag === featureFlag)) ??
    false
  );
};

const FeatureFlag: React.FC<FeatureFlagProps> = ({ featureFlag, children }) => {
  const { user } = useAuthContext();
  const isFeatureEnabled = checkIfFeatureEnabled(user ?? null, featureFlag);
  return <>{isFeatureEnabled ? children : null}</>;
};

export default FeatureFlag;
