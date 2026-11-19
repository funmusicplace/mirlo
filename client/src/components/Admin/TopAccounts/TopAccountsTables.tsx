import Select from "components/common/Select";
import { TOP_RANKING_PERIODS, TopRankingPeriod } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import TopDownloadedAlbums from "./TopDownloadedAlbums";
import TopFreeDownloads from "./TopFreeDownloads";
import TopListeners from "./TopListeners";
import TopPurchasers from "./TopPurchasers";
import TopSellers from "./TopSellers";
import TopUploaders from "./TopUploaders";

const TopAccountsTables: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [period, setPeriod] = React.useState<TopRankingPeriod>("month");

  return (
    <section className="mb-8">
      <label className="mb-4 flex items-center gap-2">
        {t("topAccountsOverThePast")}
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as TopRankingPeriod)}
          options={TOP_RANKING_PERIODS.map((value) => ({
            label: t(value),
            value,
          }))}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <TopSellers period={period} />
        <TopPurchasers period={period} />
        <TopListeners period={period} />
        <TopFreeDownloads period={period} />
        <TopUploaders period={period} />
        <TopDownloadedAlbums period={period} />
      </div>
    </section>
  );
};

export default TopAccountsTables;
