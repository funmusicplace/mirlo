import ProgressBar from "components/common/ProgressBar";
import React from "react";
import { useTranslation } from "react-i18next";

const SetupGuideProgress: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const label = t("stepOf", { current, total });

  return (
    <div className="mb-5">
      <ProgressBar label={label} value={current} max={total} min={1} />
      <small className="mt-1.5 block opacity-70">{label}</small>
    </div>
  );
};

export default SetupGuideProgress;
