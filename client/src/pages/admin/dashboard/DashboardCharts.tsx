import Select from "components/common/Select";
import { uniq } from "lodash";
import { AdminStats, StatsGranularity } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import ChartContainer from "./ChartContainer";
import {
  money,
  moneyCompact,
  Series,
  seriesColor,
  toCountPoints,
  toRevenuePoints,
  toTransactionPoints,
  wholeNumber,
} from "./chartData";
import CountChart from "./CountChart";
import StackedChart from "./StackedChart";

const DashboardCharts: React.FC<{
  stats: AdminStats;
  granularity: StatsGranularity;
  onGranularityChange: (granularity: StatsGranularity) => void;
}> = ({ stats, granularity, onGranularityChange }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  // Titles follow the data that came back, not the pending toggle.
  const isMonthly = stats.granularity === "month";
  const currency = stats.currency.toUpperCase();
  const format = money(stats.currency);
  const formatAxis = moneyCompact(stats.currency);

  const revenueSeries: Series[] = [
    { key: "purchases", name: t("purchases") },
    { key: "subscriptions", name: t("subscriptions") },
    { key: "purchasesConverted", name: t("purchasesConverted", { currency }) },
    {
      key: "subscriptionsConverted",
      name: t("subscriptionsConverted", { currency }),
    },
  ];

  const platformSeries: Series[] = [
    { key: "platformCut", name: t("platformCut", { currency }) },
    { key: "platformCutConverted", name: t("platformCutConverted") },
    { key: "instanceProfile", name: t("instanceProfileIncome") },
  ];

  const currencySeries = uniq(
    stats.transactionCounts.map((point) => point.currency)
  )
    .sort()
    .map((currency) => ({ key: currency, name: currency.toUpperCase() }));

  const revenuePoints = toRevenuePoints(stats);

  return (
    <>
      <label className="mb-4 flex items-center gap-2">
        {t("showResultsBy")}
        <Select
          value={granularity}
          onChange={(e) =>
            onGranularityChange(e.target.value as StatsGranularity)
          }
          options={[
            { label: t("week"), value: "week" },
            { label: t("month"), value: "month" },
          ]}
        />
      </label>

      <div className="flex flex-col flex-wrap gap-4 w-full justify-stretch">
        <ChartContainer
          title={
            isMonthly ? t("artistSignupsPerMonth") : t("artistSignupsPerWeek")
          }
        >
          <CountChart
            data={toCountPoints(stats.artistSignups, stats.granularity)}
            color={seriesColor(0)}
          />
        </ChartContainer>

        <ChartContainer
          title={isMonthly ? t("userSignupsPerMonth") : t("userSignupsPerWeek")}
        >
          <CountChart
            data={toCountPoints(stats.userSignups, stats.granularity)}
            color={seriesColor(1)}
          />
        </ChartContainer>

        <ChartContainer
          title={
            isMonthly
              ? t("revenuePerMonth", { currency })
              : t("revenuePerWeek", { currency })
          }
        >
          <StackedChart
            data={revenuePoints}
            series={revenueSeries}
            format={format}
            formatAxis={formatAxis}
          />
        </ChartContainer>

        <ChartContainer
          title={
            isMonthly
              ? t("platformRevenuePerMonth")
              : t("platformRevenuePerWeek")
          }
        >
          <StackedChart
            data={revenuePoints}
            series={platformSeries}
            format={format}
            formatAxis={formatAxis}
          />
        </ChartContainer>

        <ChartContainer
          title={
            isMonthly
              ? t("transactionsPerMonthByCurrency")
              : t("transactionsPerWeekByCurrency")
          }
        >
          <StackedChart
            data={toTransactionPoints(stats)}
            series={currencySeries}
            format={wholeNumber}
          />
        </ChartContainer>
      </div>
    </>
  );
};

export default DashboardCharts;
