import { moneyDisplay } from "components/common/Money";
import { groupBy, sortBy } from "lodash";
import { AdminStats, StatsGranularity } from "queries/admin";

const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

export const SURFACE = "var(--mi-background-color)";

export type Series = { key: string; name: string };

export type ChartPoint = { label: string } & Record<string, number | string>;

export const money = (currency: string) => (value: number) =>
  moneyDisplay({ amount: value, currency });

/** Axis ticks get the compact form ("$1.2K") so they don't crowd the plot. */
export const moneyCompact = (currency: string) => (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const wholeNumber = (value: number) => value.toLocaleString();

const formatDate = (date: string, granularity: StatsGranularity) =>
  new Date(date).toLocaleDateString(
    "en-US",
    granularity === "month"
      ? { month: "short", year: "numeric" }
      : { month: "short", day: "numeric" }
  );

export const seriesColor = (index: number) =>
  SERIES_COLORS[index % SERIES_COLORS.length];

export const toCountPoints = (
  points: AdminStats["userSignups"],
  granularity: StatsGranularity
) =>
  points.map((point) => ({
    label: formatDate(point.date, granularity),
    count: point.count,
  }));

export const toRevenuePoints = (stats: AdminStats) =>
  stats.revenue.map((point) => ({
    label: formatDate(point.date, stats.granularity),
    purchases: point.purchasesCents / 100,
    subscriptions: point.subscriptionsCents / 100,
    purchasesConverted: point.purchasesConvertedCents / 100,
    subscriptionsConverted: point.subscriptionsConvertedCents / 100,
    platformCut: point.platformCutCents / 100,
    platformCutConverted: point.platformCutConvertedCents / 100,
    instanceProfile: point.instanceProfileCents / 100,
  }));

/** One row per bucket, one column per currency seen in the window. */
export const toTransactionPoints = (stats: AdminStats) =>
  sortBy(Object.entries(groupBy(stats.transactionCounts, "date")), 0).map(
    ([date, points]) => ({
      label: formatDate(date, stats.granularity),
      ...Object.fromEntries(
        points.map((point) => [point.currency, point.count])
      ),
    })
  );
