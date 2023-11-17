import Button from "components/common/Button";
import React from "react";
import { bp } from "../../constants";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { AiOutlineDownload } from "react-icons/ai";
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
      <div
      className={css`
        button {
          font-size: 1.5rem;
          background: transparent;
          padding: 0;
        }
        button:hover {
          color: var(--mi-normal-background-color);
          background-color: var(--mi-normal-foreground-color) !important;
        }

        @media screen and (max-width: ${bp.small}px) {
          button {
            font-size: 1.1rem;
          }
        }
      `}
      >
        <Button
          compact
          collapse
          isLoading={isDownloading}
          startIcon={<AiOutlineDownload />}
          onClick={() => downloadAlbum()}>
          {t("download")}
        </Button>
      </div>
      </>
    </>
  );
};

export default DownloadAlbumButton;
