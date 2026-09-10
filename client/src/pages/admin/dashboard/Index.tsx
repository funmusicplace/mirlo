import { moneyDisplay } from "components/common/Money";
import Select from "components/common/Select";
import StatCard from "components/common/StatCard";
import WidthContainer from "components/common/WidthContainer";
import { groupBy, sortBy, sumBy, uniq } from "lodash";
import {
  AdminStats,
  StatsGranularity,
  useAdminStatsQuery,
} from "queries/admin";
import React from "react";
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

/**
 * Categorical slots, assigned in order and never cycled - so a chart with
 * fewer series always uses the same leading colors.
 */
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

/** Stacked bands are separated by a hairline in the surface color. */
const SURFACE = "var(--mi-background-color)";

type Series = { key: string; name: string };

type ChartPoint = { label: string } & Record<string, number | string>;

const REVENUE_SERIES: Series[] = [
  { key: "purchases", name: "Purchases" },
  { key: "subscriptions", name: "Subscriptions" },
  { key: "purchasesConverted", name: "Purchases (converted to USD)" },
  { key: "subscriptionsConverted", name: "Subscriptions (converted to USD)" },
];

const PLATFORM_SERIES: Series[] = [
  { key: "platformCut", name: "Platform cut (USD)" },
  {
    key: "platformCutConverted",
    name: "Platform cut (converted from foreign)",
  },
];

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

/**
 * Recharts' default tooltip lists each series; a stack is only readable if it
 * also adds up the bands you're hovering.
 */
export const StackedTooltip: React.FC<{
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  format: (value: number) => string;
}> = ({ active, label, payload, format }) => {
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
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span>{format(entry.value ?? 0)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-6 border-t border-(--mi-tint-x-color) pt-1 font-semibold">
        <span>Total</span>
        <span>{format(sumBy(payload, (entry) => entry.value ?? 0))}</span>
      </div>
    </div>
  );
};

const StackedChart: React.FC<{
  data: ChartPoint[];
  series: Series[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
}> = ({ data, series, format, formatAxis = format }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis tickFormatter={formatAxis} />
      <Tooltip content={<StackedTooltip format={format} />} />
      <Legend />
      {series.map(({ key, name }, index) => (
        <Area
          key={key}
          type="monotone"
          dataKey={key}
          name={name}
          stackId="total"
          fill={SERIES_COLORS[index % SERIES_COLORS.length]}
          fillOpacity={1}
          stroke={SURFACE}
          strokeWidth={2}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

/** A single-series chart: the title names it, so it needs no legend. */
const CountChart: React.FC<{ data: ChartPoint[]; color: string }> = ({
  data,
  color,
}) => (
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="count"
        name="Count"
        stroke={color}
        strokeWidth={2}
        dot={{ r: 4 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

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
  const [granularity, setGranularity] =
    React.useState<StatsGranularity>("week");
  const { data: stats, error } = useAdminStatsQuery(granularity, DAYS);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!stats) {
    return <div>Loading dashboard...</div>;
  }

  // Titles follow the data that came back, not the pending toggle.
  const per = stats.granularity === "month" ? "Month" : "Week";

  const currencySeries = uniq(
    stats.transactionCounts.map((point) => point.currency)
  )
    .sort()
    .map((currency) => ({ key: currency, name: currency.toUpperCase() }));

  const revenuePoints = toRevenuePoints(stats);

  return (
    <WidthContainer variant="big" justify="center" className="grow p-4">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Monthly Plays"
          value={stats.avgMonthlyPlays.toLocaleString()}
          subtext="avg / month (last 12 months)"
        />
        <StatCard
          label="Monthly Active Users"
          value={stats.avgMonthlyActiveUsers.toLocaleString()}
          subtext="avg / month (last 12 months)"
        />
        <StatCard
          label="Monthly Album Downloads"
          value={stats.avgMonthlyAlbumDownloads.toLocaleString()}
          subtext="avg / month (last 12 months)"
        />
      </div>

      <label className="mb-4 flex items-center gap-2">
        Show results by
        <Select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as StatsGranularity)}
          options={[
            { label: "Week", value: "week" },
            { label: "Month", value: "month" },
          ]}
        />
      </label>

      <div className="flex flex-col flex-wrap gap-4 w-full justify-stretch">
        <ChartContainer title={`Artist Signups Per ${per}`}>
          <CountChart
            data={toCountPoints(stats.artistSignups, stats.granularity)}
            color={SERIES_COLORS[0]}
          />
        </ChartContainer>

        <ChartContainer title={`User Signups Per ${per}`}>
          <CountChart
            data={toCountPoints(stats.userSignups, stats.granularity)}
            color={SERIES_COLORS[1]}
          />
        </ChartContainer>

        <ChartContainer title={`USD Revenue Per ${per}`}>
          <StackedChart
            data={revenuePoints}
            series={REVENUE_SERIES}
            format={usd}
            formatAxis={usdCompact}
          />
        </ChartContainer>

        <ChartContainer title={`Platform Revenue Per ${per}`}>
          <StackedChart
            data={revenuePoints}
            series={PLATFORM_SERIES}
            format={usd}
            formatAxis={usdCompact}
          />
        </ChartContainer>

        <ChartContainer title={`Transactions Per ${per} by Currency`}>
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
