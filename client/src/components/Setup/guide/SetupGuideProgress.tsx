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
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="h-1.5 overflow-hidden rounded-(--mi-border-radius) border border-(--mi-tint-x-color) bg-(--mi-tint-color)"
      >
        <div
          className="h-full bg-(--mi-button-color)"
          style={{ width: `${Math.round((current / total) * 100)}%` }}
        />
      </div>
      <small className="mt-1.5 block opacity-70">{label}</small>
    </div>
  );
};

export default SetupGuideProgress;
