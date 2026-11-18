import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";

import {
  artistColumn,
  byId,
  countColumn,
  useDashboardT,
} from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopUploaders: React.FC<{ period: TopRankingPeriod }> = ({ period }) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topUploaders", period);

  return (
    <RankingTable
      title={t("topUploaders")}
      emptyMessage={t("noUploadsInPeriod")}
      ranking="topUploaders"
      period={period}
      rows={data?.rows}
      error={error}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("releases"), "albumsUploaded"),
        countColumn(t("tracks"), "tracksUploaded"),
      ]}
    />
  );
};

export default TopUploaders;
