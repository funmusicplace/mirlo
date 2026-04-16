import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "services/api";
import { moneyDisplay } from "components/common/Money";

interface StatsData {
  userSignupsByWeek: Array<{ week: string; count: number }>;
  artistSignupsByWeek: Array<{ week: string; count: number }>;
  transactionsByWeek: Array<{ week: string; count: number }>;
  transactionAmountByWeek: Array<{
    week: string;
    currency: string;
    totalAmountCents: number;
  }>;
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

export const AdminDashboard: React.FC = () => {
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

  const transactionAmountByCurrency = stats.transactionAmountByWeek.reduce<
    Record<
      string,
      Array<{ week: string; totalAmount: number; weekLabel: string }>
    >
  >((result, item) => {
    if (!result[item.currency]) {
      result[item.currency] = [];
    }

    result[item.currency].push({
      week: item.week,
      totalAmount: item.totalAmountCents / 100,
      weekLabel: formatWeekLabel(item.week),
    });

    return result;
  }, {});

  const transactionCurrencies = Object.keys(transactionAmountByCurrency).sort();

  return (
    <div className="flex-grow p-4">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

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

        {transactionCurrencies.map((currency, index) => (
          <ChartContainer
            key={currency}
            title={`Transaction Volume Per Week (${currency})`}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={transactionAmountByCurrency[currency]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis
                  tickFormatter={(value) =>
                    moneyDisplay({ amount: Number(value), currency })
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    moneyDisplay({ amount: Number(value), currency }),
                    "Volume",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="totalAmount"
                  stroke={
                    transactionVolumeColors[
                      index % transactionVolumeColors.length
                    ]
                  }
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
