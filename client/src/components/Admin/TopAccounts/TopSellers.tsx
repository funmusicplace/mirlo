import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";

import {
  artistColumn,
  byId,
  countColumn,
  moneyColumn,
  useDashboardT,
} from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopSellers: React.FC<{ period: TopRankingPeriod }> = ({ period }) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topSellers", period);

  return (
    <RankingTable
      title={t("topSellers")}
      emptyMessage={t("noSalesInPeriod")}
      ranking="topSellers"
      period={period}
      rows={data?.rows}
      error={error}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("transactions"), "salesCount"),
        moneyColumn(t("revenue"), "revenueCents", data?.currency),
      ]}
    />
  );
};

export default TopSellers;
