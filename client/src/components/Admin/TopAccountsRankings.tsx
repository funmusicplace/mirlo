import { moneyDisplay } from "components/common/Money";
import {
  AdminTopDownloadedAlbum,
  AdminTopFreeDownloadArtist,
  AdminTopPurchaser,
  AdminTopSeller,
  AdminTopUploader,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import RankingTable, { RankingColumn } from "./RankingTable";

const ArtistLink: React.FC<{ id: number; name: string }> = ({ id, name }) => (
  <Link to={`/admin/content/artists/${id}`}>{name}</Link>
);

const artistColumn = <T extends { id: number; name: string }>(
  header: string
): RankingColumn<T> => ({
  header,
  cell: (row) => <ArtistLink id={row.id} name={row.name} />,
});

const countColumn = <K extends string>(
  header: string,
  field: K
): RankingColumn<Record<K, number>> => ({
  header,
  numeric: true,
  cell: (row) => row[field].toLocaleString(),
});

const usdColumn = <T extends { usdCents: number }>(
  header: string
): RankingColumn<T> => ({
  header,
  numeric: true,
  cell: (row) => moneyDisplay({ amount: row.usdCents / 100, currency: "usd" }),
});

const byId = (row: { id: number }) => row.id;

const useDashboardT = () =>
  useTranslation("translation", { keyPrefix: "adminDashboard" }).t;

export const TopSellers: React.FC<{ rows: AdminTopSeller[] }> = ({ rows }) => {
  const t = useDashboardT();
  return (
    <RankingTable
      title={t("topSellers")}
      emptyMessage={t("noSalesInPeriod")}
      rows={rows}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("transactions"), "transactionCount"),
        usdColumn(t("usd")),
      ]}
    />
  );
};

export const TopPurchasers: React.FC<{ rows: AdminTopPurchaser[] }> = ({
  rows,
}) => {
  const t = useDashboardT();
  return (
    <RankingTable
      title={t("topPurchasers")}
      emptyMessage={t("noSalesInPeriod")}
      rows={rows}
      getKey={byId}
      columns={[
        {
          header: t("user"),
          cell: (row) => (
            <Link to={`/admin/content/users/${row.id}`}>
              {row.name || row.email}
            </Link>
          ),
        },
        countColumn(t("transactions"), "transactionCount"),
        usdColumn(t("usd")),
      ]}
    />
  );
};

export const TopFreeDownloads: React.FC<{
  rows: AdminTopFreeDownloadArtist[];
}> = ({ rows }) => {
  const t = useDashboardT();
  return (
    <RankingTable
      title={t("topFreeDownloads")}
      emptyMessage={t("noFreeDownloadsInPeriod")}
      rows={rows}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("freeDownloads"), "downloadCount"),
      ]}
    />
  );
};

export const TopUploaders: React.FC<{ rows: AdminTopUploader[] }> = ({
  rows,
}) => {
  const t = useDashboardT();
  return (
    <RankingTable
      title={t("topUploaders")}
      emptyMessage={t("noUploadsInPeriod")}
      rows={rows}
      getKey={byId}
      columns={[
        artistColumn(t("artist")),
        countColumn(t("releases"), "trackGroupCount"),
        countColumn(t("tracks"), "trackCount"),
      ]}
    />
  );
};

export const TopDownloadedAlbums: React.FC<{
  rows: AdminTopDownloadedAlbum[];
}> = ({ rows }) => {
  const t = useDashboardT();
  return (
    <RankingTable
      title={t("topDownloadedAlbums")}
      emptyMessage={t("noAlbumDownloadsInPeriod")}
      rows={rows}
      getKey={byId}
      columns={[
        {
          header: t("album"),
          cell: (row) => (
            <Link to={`/admin/content/track-groups/${row.id}`}>
              {row.title || t("untitledAlbum")}
            </Link>
          ),
        },
        {
          header: t("artist"),
          cell: (row) => <ArtistLink id={row.artistId} name={row.artistName} />,
        },
        countColumn(t("downloads"), "downloadCount"),
      ]}
    />
  );
};
