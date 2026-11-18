import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";

import {
  byId,
  countColumn,
  moneyColumn,
  useDashboardT,
  userColumn,
} from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopPurchasers: React.FC<{ period: TopRankingPeriod }> = ({ period }) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topPurchasers", period);

  return (
    <RankingTable
      title={t("topPurchasers")}
      emptyMessage={t("noSalesInPeriod")}
      ranking="topPurchasers"
      period={period}
      rows={data?.rows}
      error={error}
      getKey={byId}
      columns={[
        userColumn(t("user")),
        countColumn(t("transactions"), "transactionCount"),
        moneyColumn(t("revenue"), "cents", data?.currency),
      ]}
    />
  );
};

export default TopPurchasers;
