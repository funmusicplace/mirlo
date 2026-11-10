import React from "react";
import { useTranslation } from "react-i18next";

const STROKE = 4;

const FundraiserProgressCircle: React.FC<{
  amountRaised: number;
  goalAmount: number;
  size?: number;
}> = ({ amountRaised, goalAmount, size = 36 }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserProgress",
  });
  const percent =
    goalAmount > 0 ? Math.floor((amountRaised / goalAmount) * 100) : 0;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(percent, 100) / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-label={t("percentOfGoal", { percent })}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-(--mi-tint-x-color)"
        />
        {filled > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="stroke-(--mi-button-color)"
          />
        )}
      </svg>
      <span
        aria-hidden
        className="absolute font-semibold leading-none"
        style={{ fontSize: Math.max(size * 0.26, 8) }}
      >
        {percent}%
      </span>
    </div>
  );
};

export default FundraiserProgressCircle;
