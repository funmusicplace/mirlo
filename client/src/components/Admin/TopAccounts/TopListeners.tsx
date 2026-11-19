import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";

import { byId, countColumn, useDashboardT, userColumn } from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopListeners: React.FC<{ period: TopRankingPeriod }> = ({ period }) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topListeners", period);

  return (
    <RankingTable
      title={t("topListeners")}
      emptyMessage={t("noPlaysInPeriod")}
      ranking="topListeners"
      period={period}
      rows={data?.rows}
      error={error}
      getKey={byId}
      columns={[
        userColumn(t("user")),
        countColumn(t("plays"), "playCount"),
        countColumn(t("artists"), "artistCount"),
      ]}
    />
  );
};

export default TopListeners;
