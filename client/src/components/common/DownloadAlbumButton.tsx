import IconButton from "components/common/IconButton";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { RiDownloadLine } from "react-icons/ri";
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
        <div>
          <IconButton
            compact
            transparent
            className={css`
              margin-top: 0rem;
              font-size: 1.2rem;
              background: transparent;
            `}
            isLoading={isDownloading}
            startIcon={<RiDownloadLine />}
            onClick={() => downloadAlbum()}
          >
            <RiDownloadLine />
          </IconButton>
        </div>
      </>
    </>
  );
};

export default DownloadAlbumButton;
