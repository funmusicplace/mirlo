import TopAccountsTables from "components/Admin/TopAccounts/TopAccountsTables";
import StatCard from "components/common/StatCard";
import WidthContainer from "components/common/WidthContainer";
import SetupStatusCard from "components/Setup/status/SetupStatusCard";
import { StatsGranularity, useAdminStatsQuery } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import DashboardCharts from "./DashboardCharts";
import DashboardSkeleton from "./DashboardSkeleton";

const DAYS = 365;

export const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [granularity, setGranularity] =
    React.useState<StatsGranularity>("week");
  const { data: stats, error } = useAdminStatsQuery(granularity, DAYS);

  if (error) {
    return <div>{t("error", { message: error.message })}</div>;
  }

  if (!stats) {
    return <DashboardSkeleton />;
  }

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

      <DashboardCharts
        stats={stats}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />
    </WidthContainer>
  );
};

export default Index;
