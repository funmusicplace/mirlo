import { moneyDisplay } from "components/common/Money";
import React from "react";
import { Trans, useTranslation } from "react-i18next";

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
  const ratio = goalAmount > 0 ? amountRaised / goalAmount : 0;
  const filled = Math.min(ratio, 1) * 100;
  const money = (amount: number) =>
    moneyDisplay({
      amount: amount / 100,
      currency,
      options: { trailingZeroDisplay: "stripIfInteger" },
    });
  const raised = money(amountRaised);
  const percent = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Math.floor(ratio * 1000) / 1000);

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(filled)}
        aria-label={i18n.t("fundraiserProgress.percentOfGoal", {
          percent: Math.floor(ratio * 100),
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
          <span className="text-sm opacity-70">
            {t("goalAmount", { amount: money(goalAmount) })}
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm">
        {pledgeCount !== undefined && (
          <>
            <Trans
              t={t}
              i18nKey="pledgeCount"
              count={pledgeCount}
              values={{
                count: pledgeCount,
                formattedCount: pledgeCount.toLocaleString(i18n.language),
              }}
              components={{ strong: <strong /> }}
            />
            <span className="mx-2" aria-hidden>
              ·
            </span>
          </>
        )}
        <Trans
          t={t}
          i18nKey="percentOfGoal"
          values={{ percent }}
          components={{ strong: <strong /> }}
        />
      </p>
      <p className="mt-1 text-center text-sm">
        {endDate &&
          t("endsOn", {
            date: new Date(endDate).toLocaleDateString(i18n.language),
          })}
      </p>
    </div>
  );
};

export default FundraiserGauge;
