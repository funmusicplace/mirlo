import Select from "components/common/Select";
import { TopAccountsPeriod, useAdminTopAccountsQuery } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";

import {
  TopDownloadedAlbums,
  TopFreeDownloads,
  TopPurchasers,
  TopSellers,
  TopUploaders,
} from "./TopAccountsRankings";

const TopAccountsTables: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [period, setPeriod] = React.useState<TopAccountsPeriod>("month");
  const { data, error } = useAdminTopAccountsQuery(period);

  return (
    <section className="mb-8">
      <label className="mb-4 flex items-center gap-2">
        {t("topAccountsOverThePast")}
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as TopAccountsPeriod)}
          options={[
            { label: t("month"), value: "month" },
            { label: t("year"), value: "year" },
          ]}
        />
      </label>

      {error && <div>{t("error", { message: error.message })}</div>}
      {!data && !error && <div>{t("loadingTopAccounts")}</div>}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <TopSellers rows={data.sellers} />
          <TopPurchasers rows={data.purchasers} />
          <TopFreeDownloads rows={data.freeDownloads} />
          <TopUploaders rows={data.uploaders} />
          <TopDownloadedAlbums rows={data.downloadedAlbums} />
        </div>
      )}
    </section>
  );
};

export default TopAccountsTables;
