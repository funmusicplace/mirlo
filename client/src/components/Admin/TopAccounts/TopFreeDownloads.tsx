import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";

import {
  artistColumn,
  byId,
  countColumn,
  useDashboardT,
} from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopFreeDownloads: React.FC<{ period: TopRankingPeriod }> = ({
  period,
}) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topFreeDownloads", period);

  return (
    <RankingTable
      title={t("topFreeDownloads")}
      emptyMessage={t("noFreeDownloadsInPeriod")}
      ranking="topFreeDownloads"
      period={period}
      rows={data?.rows}
      error={error}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("freeDownloads"), "freeDownloads"),
      ]}
    />
  );
};

export default TopFreeDownloads;
