import { centsDisplay } from "components/common/Money";
import { toLanguageTag } from "i18n";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { fundraiserPercent } from "utils/fundraiserPercent";

const ARC = "M 10 100 A 90 90 0 0 1 190 100";
const GAUGE_WIDTH = 10;

const amountSize = (text: string) =>
  text.length <= 8 ? "text-5xl" : text.length <= 11 ? "text-4xl" : "text-3xl";

const FundraiserGauge: React.FC<{
  amountRaised: number;
  goalAmount: number;
  currency?: string;
  pledgeCount?: number;
  className?: string;
  endDate: string | null;
}> = ({
  amountRaised,
  goalAmount,
  currency,
  pledgeCount,
  className,
  endDate,
}) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "fundraiserPage",
  });
  const locale = toLanguageTag(i18n.resolvedLanguage);
  const hasGoal = goalAmount > 0;
  const wholePercent = fundraiserPercent(amountRaised, goalAmount);
  const filled = Math.min(wholePercent, 100);
  const raised = centsDisplay(amountRaised, currency);
  const goal = t("goalAmount", { amount: centsDisplay(goalAmount, currency) });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(
    hasGoal ? Math.floor((amountRaised * 1000) / goalAmount) / 1000 : 0
  );

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={filled}
        aria-valuetext={hasGoal ? `${raised}, ${goal}` : raised}
        aria-label={i18n.t("fundraiserProgress.percentOfGoal", {
          percent: wholePercent,
        })}
        className="relative mx-auto w-full max-w-sm"
      >
        <svg viewBox="0 0 200 100" className="w-full" aria-hidden>
          <path
            d={ARC}
            fill="none"
            strokeWidth={GAUGE_WIDTH}
            pathLength={100}
            className="stroke-(--mi-tint-x-color)"
          />
          {filled > 0 && (
            <path
              d={ARC}
              fill="none"
              strokeWidth={GAUGE_WIDTH}
              pathLength={100}
              strokeDasharray={`${filled} 100`}
              className="stroke-(--mi-button-color)"
            />
          )}
        </svg>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 flex flex-col items-center"
        >
          <span className={`${amountSize(raised)} leading-tight font-black`}>
            {raised}
          </span>
          {hasGoal && <span className="text-sm">{goal}</span>}
        </div>
      </div>
      <p className="mt-3 text-center text-sm">
        {pledgeCount !== undefined && (
          <Trans
            t={t}
            i18nKey="pledgeCount"
            count={pledgeCount}
            values={{
              count: pledgeCount,
              formattedCount: pledgeCount.toLocaleString(locale),
            }}
            components={{ strong: <strong /> }}
          />
        )}
        {pledgeCount !== undefined && hasGoal && (
          <span className="mx-2" aria-hidden>
            ·
          </span>
        )}
        {hasGoal && (
          <Trans
            t={t}
            i18nKey="percentOfGoal"
            values={{ percent }}
            components={{ strong: <strong /> }}
          />
        )}
      </p>
      {endDate && (
        <p className="mt-1 text-center text-sm">
          {t("endsOn", {
            date: new Date(endDate).toLocaleDateString(locale),
          })}
        </p>
      )}
    </div>
  );
};

export default FundraiserGauge;
