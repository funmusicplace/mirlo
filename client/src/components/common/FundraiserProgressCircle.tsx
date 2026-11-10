import React from "react";
import { useTranslation } from "react-i18next";
import { fundraiserPercent } from "utils/fundraiserPercent";

const VIEWBOX = 30;
const STROKE = 6;
const RADIUS = (VIEWBOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SIZES = {
  small: "size-9 text-[9px]",
  large: "size-12 text-xs",
};

const FundraiserProgressCircle: React.FC<{
  amountRaised: number;
  goalAmount: number;
  size?: keyof typeof SIZES;
}> = ({ amountRaised, goalAmount, size = "small" }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserProgress",
  });
  const percent = fundraiserPercent(amountRaised, goalAmount);
  const filled = (Math.min(percent, 100) / 100) * CIRCUMFERENCE;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-label={t("percentOfGoal", { percent })}
      className={`relative inline-flex shrink-0 items-center justify-center ${SIZES[size]}`}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-(--mi-tint-x-color)"
        />
        {filled > 0 && (
          <circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            className="stroke-(--mi-button-color)"
          />
        )}
      </svg>
      <span aria-hidden className="absolute font-semibold leading-none">
        {percent}%
      </span>
    </div>
  );
};

export default FundraiserProgressCircle;
