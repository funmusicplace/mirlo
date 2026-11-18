import { DropdownMenuItemButton } from "components/common/DropdownMenuItem";
import {
  adminTopRankingEndpoint,
  TopRanking,
  TopRankingPeriod,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDownload } from "react-icons/fa";
import api from "services/api";

const DownloadRankingCsv: React.FC<{
  ranking: TopRanking;
  period: TopRankingPeriod;
}> = ({ ranking, period }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });
  const [isDownloading, setIsDownloading] = React.useState(false);

  const download = async () => {
    setIsDownloading(true);
    try {
      await api.getFile(
        `${ranking}-${period}`,
        `${adminTopRankingEndpoint(ranking, period)}&format=csv`,
        "text/csv"
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <li>
      <DropdownMenuItemButton
        onClick={download}
        isLoading={isDownloading}
        startIcon={<FaDownload />}
      >
        {t("downloadCsv")}
      </DropdownMenuItemButton>
    </li>
  );
};

export default DownloadRankingCsv;
