import TopAccountsTables from "components/Admin/TopAccountsTables";
import { moneyDisplay } from "components/common/Money";
import Select from "components/common/Select";
import StatCard from "components/common/StatCard";
import WidthContainer from "components/common/WidthContainer";
import SetupStatusCard from "components/Setup/status/SetupStatusCard";
import { groupBy, sortBy, sumBy, uniq } from "lodash";
import {
  AdminStats,
  StatsGranularity,
  useAdminStatsQuery,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAYS = 365;

const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

const SURFACE = "var(--mi-background-color)";

type Series = { key: string; name: string };

type ChartPoint = { label: string } & Record<string, number | string>;

const usd = (value: number) => moneyDisplay({ amount: value, currency: "usd" });

/** Axis ticks get the compact form ("$1.2K") so they don't crowd the plot. */
const usdCompact = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "usd",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const wholeNumber = (value: number) => value.toLocaleString();

const formatDate = (date: string, granularity: StatsGranularity) =>
  new Date(date).toLocaleDateString(
    "en-US",
    granularity === "month"
      ? { month: "short", year: "numeric" }
      : { month: "short", day: "numeric" }
  );

const ChartContainer: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="mb-8 p-4 rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color)">
    <h4 className="mb-4 font-semibold">{title}</h4>
    {children}
  </div>
);

const seriesColor = (index: number) =>
  SERIES_COLORS[index % SERIES_COLORS.length];

/**
 * Lists each hovered series next to a swatch of its color. Recharts reports an
 * Area's stroke as its color, and ours is the surface-colored band separator,
 * so swatches come from `colors` (keyed by dataKey) instead.
 *
 * A stack is only readable if it also adds up the bands you're hovering.
 */
export const ChartTooltip: React.FC<{
  active?: boolean;
  label?: string;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number;
    color?: string;
  }>;
  format: (value: number) => string;
  colors?: Record<string, string>;
  showTotal?: boolean;
}> = ({ active, label, payload, format, colors = {}, showTotal = true }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-(--mi-tint-x-color) bg-(--mi-background-color) px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-6">
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{
                backgroundColor: colors[String(entry.dataKey)] ?? entry.color,
              }}
            />
            {entry.name}
          </span>
          <span>{format(entry.value ?? 0)}</span>
        </div>
      ))}
      {showTotal && (
        <div className="mt-1 flex justify-between gap-6 border-t border-(--mi-tint-x-color) pt-1 font-semibold">
          <span>{t("total")}</span>
          <span>{format(sumBy(payload, (entry) => entry.value ?? 0))}</span>
        </div>
      )}
    </div>
  );
};

const StackedChart: React.FC<{
  data: ChartPoint[];
  series: Series[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
}> = ({ data, series, format, formatAxis = format }) => {
  const colors = Object.fromEntries(
    series.map(({ key }, index) => [key, seriesColor(index)])
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={formatAxis} />
        <Tooltip content={<ChartTooltip format={format} colors={colors} />} />
        {/* Same stroke problem as the tooltip, so name the colors outright. */}
        <Legend
          payload={series.map(({ key, name }) => ({
            id: key,
            value: name,
            type: "square",
            color: colors[key],
          }))}
        />
        {series.map(({ key, name }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={name}
            stackId="total"
            fill={colors[key]}
            fillOpacity={1}
            stroke={SURFACE}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

/** A single-series chart: the title names it, so it needs no legend. */
const CountChart: React.FC<{ data: ChartPoint[]; color: string }> = ({
  data,
  color,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip
          content={
            <ChartTooltip
              format={wholeNumber}
              colors={{ count: color }}
              showTotal={false}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          name={t("count")}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const toCountPoints = (
  points: AdminStats["userSignups"],
  granularity: StatsGranularity
) =>
  points.map((point) => ({
    label: formatDate(point.date, granularity),
    count: point.count,
  }));

const toRevenuePoints = (stats: AdminStats) =>
  stats.revenue.map((point) => ({
    label: formatDate(point.date, stats.granularity),
    purchases: point.purchasesUsdCents / 100,
    subscriptions: point.subscriptionsUsdCents / 100,
    purchasesConverted: point.purchasesConvertedUsdCents / 100,
    subscriptionsConverted: point.subscriptionsConvertedUsdCents / 100,
    platformCut: point.platformCutUsdCents / 100,
    platformCutConverted: point.platformCutConvertedUsdCents / 100,
    instanceProfile: point.instanceProfileUsdCents / 100,
  }));

/** One row per bucket, one column per currency seen in the window. */
const toTransactionPoints = (stats: AdminStats) =>
  sortBy(Object.entries(groupBy(stats.transactionCounts, "date")), 0).map(
    ([date, points]) => ({
      label: formatDate(date, stats.granularity),
      ...Object.fromEntries(
        points.map((point) => [point.currency, point.count])
      ),
    })
  );

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [granularity, setGranularity] =
    React.useState<StatsGranularity>("week");
  const { data: stats, error } = useAdminStatsQuery(granularity, DAYS);

  if (error) {
    return <div>{t("error", { message: error.message })}</div>;
  }

  if (!stats) {
    return <div>{t("loading")}</div>;
  }

  // Titles follow the data that came back, not the pending toggle.
  const isMonthly = stats.granularity === "month";

  const revenueSeries: Series[] = [
    { key: "purchases", name: t("purchases") },
    { key: "subscriptions", name: t("subscriptions") },
    { key: "purchasesConverted", name: t("purchasesConverted") },
    { key: "subscriptionsConverted", name: t("subscriptionsConverted") },
  ];

  const platformSeries: Series[] = [
    { key: "platformCut", name: t("platformCut") },
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
    <WidthContainer variant="big" justify="center" className="grow p-4">
      <h2 className="text-2xl font-bold mb-6">{t("title")}</h2>

      <SetupStatusCard />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t("monthlyPlays")}
          value={stats.avgMonthlyPlays.toLocaleString()}
          subtext={t("avgPerMonthLast12")}
        />
        <StatCard
          label={t("monthlyActiveUsers")}
          value={stats.avgMonthlyActiveUsers.toLocaleString()}
          subtext={t("avgPerMonthLast12")}
        />
        <StatCard
          label={t("monthlyAlbumDownloads")}
          value={stats.avgMonthlyAlbumDownloads.toLocaleString()}
          subtext={t("avgPerMonthLast12")}
        />
      </div>

      <TopAccountsTables />

      <label className="mb-4 flex items-center gap-2">
        {t("showResultsBy")}
        <Select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as StatsGranularity)}
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
          title={isMonthly ? t("usdRevenuePerMonth") : t("usdRevenuePerWeek")}
        >
          <StackedChart
            data={revenuePoints}
            series={revenueSeries}
            format={usd}
            formatAxis={usdCompact}
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
            format={usd}
            formatAxis={usdCompact}
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
    </WidthContainer>
  );
};

export default Index;
