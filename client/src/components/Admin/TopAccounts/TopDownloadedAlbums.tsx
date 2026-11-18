import { TopRankingPeriod, useAdminTopRankingQuery } from "queries/admin";
import React from "react";
import { Link } from "react-router-dom";

import {
  adminArtistPath,
  byId,
  countColumn,
  useDashboardT,
} from "./rankingColumns";
import RankingTable from "./RankingTable";

const TopDownloadedAlbums: React.FC<{ period: TopRankingPeriod }> = ({
  period,
}) => {
  const t = useDashboardT();
  const { data, error } = useAdminTopRankingQuery("topAlbums", period);

  return (
    <RankingTable
      title={t("topDownloadedAlbums")}
      emptyMessage={t("noAlbumDownloadsInPeriod")}
      ranking="topAlbums"
      period={period}
      rows={data?.rows}
      error={error}
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
          cell: (row) => (
            <Link to={adminArtistPath(row.artistId)}>{row.artistName}</Link>
          ),
        },
        countColumn(t("downloads"), "downloadCount"),
      ]}
    />
  );
};

export default TopDownloadedAlbums;
