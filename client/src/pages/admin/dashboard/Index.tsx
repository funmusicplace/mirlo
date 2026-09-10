import { moneyDisplay } from "components/common/Money";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "services/api";

interface StatsData {
  userSignupsByWeek: Array<{ week: string; count: number }>;
  artistSignupsByWeek: Array<{ week: string; count: number }>;
  transactionsByWeek: Array<{ week: string; count: number }>;
  usdRevenueByWeek: Array<{
    week: string;
    purchasesUsdCents: number;
    subscriptionsUsdCents: number;
    purchasesConvertedUsdCents: number;
    subscriptionsConvertedUsdCents: number;
  }>;
  transactionCountByWeek: Array<{
    week: string;
    currency: string;
    count: number;
  }>;
  platformRevenueByWeek: Array<{
    week: string;
    platformCutUsdCents: number;
    platformCutConvertedUsdCents: number;
  }>;
  avgMonthlyPlays: number;
  avgMonthlyActiveUsers: number;
  avgMonthlyAlbumDownloads: number;
}

const transactionVolumeColors = [
  "#ff8a65",
  "#4db6ac",
  "#64b5f6",
  "#ba68c8",
  "#ffd54f",
];

const ChartContainer: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="mb-8 p-4 border border-gray-200 rounded-md bg-white">
    <h4 className="mb-4 font-semibold">{title}</h4>
    {children}
  </div>
);

const KpiCard: React.FC<{ title: string; value: number | string }> = ({
  title,
  value,
}) => (
  <div className="p-4 border border-gray-200 rounded-md bg-white flex flex-col gap-1">
    <span className="text-sm text-gray-500">{title}</span>
    <span className="text-3xl font-bold">{value.toLocaleString()}</span>
    <span className="text-xs text-gray-400">avg / month (last 12 months)</span>
  </div>
);

export const Index: React.FC = () => {
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.get<StatsData>("admin/stats?days=365");
        setStats(data.result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  // Format week string to readable date (YYYY-MM-DD to MMM DD)
  const formatWeekLabel = (weekStr: string) => {
    const date = new Date(weekStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatChartData = (data: Array<{ week: string; count: number }>) =>
    data.map((item) => ({
      ...item,
      weekLabel: formatWeekLabel(item.week),
    }));

  const usdRevenueChartData = stats.usdRevenueByWeek.map((item) => ({
    weekLabel: formatWeekLabel(item.week),
    purchases: item.purchasesUsdCents / 100,
    subscriptions: item.subscriptionsUsdCents / 100,
    purchasesConverted: item.purchasesConvertedUsdCents / 100,
    subscriptionsConverted: item.subscriptionsConvertedUsdCents / 100,
  }));

  const transactionCountByWeek = stats.transactionCountByWeek.reduce<
    Record<string, Record<string, number | string>>
  >((result, item) => {
    if (!result[item.week]) {
      result[item.week] = {
        week: item.week,
        weekLabel: formatWeekLabel(item.week),
      };
    }
    result[item.week][item.currency] = item.count;
    return result;
  }, {});

  const transactionCountChartData = Object.values(transactionCountByWeek).sort(
    (a, b) => (a.week as string).localeCompare(b.week as string)
  );

  const transactionCurrencies = Array.from(
    new Set(stats.transactionCountByWeek.map((item) => item.currency))
  ).sort();

  const platformRevenueChartData = stats.platformRevenueByWeek.map((item) => ({
    weekLabel: formatWeekLabel(item.week),
    platformCut: item.platformCutUsdCents / 100,
    platformCutConverted: item.platformCutConvertedUsdCents / 100,
  }));

  return (
    <WidthContainer variant="big" justify="center" className="grow p-4">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard title="Monthly Plays" value={stats.avgMonthlyPlays} />
        <KpiCard
          title="Monthly Active Users"
          value={stats.avgMonthlyActiveUsers}
        />
        <KpiCard
          title="Monthly Album Downloads"
          value={stats.avgMonthlyAlbumDownloads}
        />
      </div>

      <div className="flex flex-col flex-wrap gap-4 w-full justify-stretch">
        <ChartContainer title="Artist Signups Per Week">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formatChartData(stats.artistSignupsByWeek)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="User Signups Per Week">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formatChartData(stats.userSignupsByWeek)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#82ca9d"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Total Transactions Per Week">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formatChartData(stats.transactionsByWeek)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ffc658"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="USD Revenue Per Week">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usdRevenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis
                tickFormatter={(value) =>
                  moneyDisplay({ amount: Number(value), currency: "usd" })
                }
              />
              <Tooltip
                formatter={(value) =>
                  moneyDisplay({ amount: Number(value), currency: "usd" })
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="purchases"
                name="Purchases"
                stroke={transactionVolumeColors[0]}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="subscriptions"
                name="Subscriptions"
                stroke={transactionVolumeColors[1]}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="purchasesConverted"
                name="Purchases (converted to USD)"
                stroke={transactionVolumeColors[2]}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="subscriptionsConverted"
                name="Subscriptions (converted to USD)"
                stroke={transactionVolumeColors[3]}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Platform Revenue Per Week">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={platformRevenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis
                tickFormatter={(value) =>
                  moneyDisplay({ amount: Number(value), currency: "usd" })
                }
              />
              <Tooltip
                formatter={(value) =>
                  moneyDisplay({ amount: Number(value), currency: "usd" })
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="platformCut"
                name="Platform cut (USD)"
                stroke={transactionVolumeColors[0]}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="platformCutConverted"
                name="Platform cut (converted from foreign)"
                stroke={transactionVolumeColors[2]}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Transaction Count Per Week by Currency">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transactionCountChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis />
              <Tooltip />
              <Legend />
              {transactionCurrencies.map((currency, index) => (
                <Line
                  key={currency}
                  type="monotone"
                  dataKey={currency}
                  name={currency.toUpperCase()}
                  stroke={
                    transactionVolumeColors[
                      index % transactionVolumeColors.length
                    ]
                  }
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </WidthContainer>
  );
};

export default Index;
