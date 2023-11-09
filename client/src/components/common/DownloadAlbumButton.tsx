import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowDown } from "react-icons/fa";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useArtistContext } from "state/ArtistContext";

const DownloadAlbumButton: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const snackbar = useSnackbar();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { state } = useArtistContext();

  if (!trackGroup || !state?.artist) {
    return null;
  }

  const downloadAlbum = async () => {
    try {
      setIsDownloading(true);
      await api.downloadFileDirectly(
        `trackGroups/${trackGroup.id}/download`,
        `${trackGroup.title}.zip`
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <>
        <Button
          compact
          collapse
          isLoading={isDownloading}
          startIcon={<FaArrowDown />}
          onClick={() => downloadAlbum()}
        >
          {t("download")}
        </Button>
      </>
    </>
  );
};

export default DownloadAlbumButton;
