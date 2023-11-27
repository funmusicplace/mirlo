import Button from "components/common/Button";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { RiDownloadLine } from "react-icons/ri";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useArtistContext } from "state/ArtistContext";
import Modal from "./Modal";
import Select from "./Select";

const formats = ["flac", "wav", "opus", "320.mp3", "256.mp3", "128.mp3"];

const DownloadAlbumButton: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [chosenFormat, setChosenFormat] = React.useState(formats[0]);
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const snackbar = useSnackbar();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { state } = useArtistContext();
  const downloadAlbum = React.useCallback(async () => {
    try {
      setIsDownloading(true);
      await api.downloadFileDirectly(
        `trackGroups/${trackGroup.id}/download?format=${chosenFormat}`,
        `${trackGroup.title}.zip`
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  }, [chosenFormat, snackbar, t, trackGroup.id, trackGroup.title]);

  if (!trackGroup || !state?.artist) {
    return null;
  }

  return (
    <div>
      <Modal
        title={t("download") ?? ""}
        open={isPopupOpen}
        size="small"
        onClose={() => setIsPopupOpen(false)}
      >
        <p>What file type do you want to download?</p>
        <Select
          value={chosenFormat}
          onChange={(e) => setChosenFormat(e.target.value)}
          options={formats.map((format) => ({ value: format, label: format }))}
        />
        <Button
          compact
          className={css`
            margin-top: 0.5rem;
            font-size: 1.2rem;
            background: transparent;
          `}
          isLoading={isDownloading}
          onClick={() => downloadAlbum()}
        >
          Download
        </Button>
      </Modal>
      <Button
        compact
        transparent
        onlyIcon
        className={css`
          margin-top: 0rem;
          font-size: 1.2rem;
          background: transparent;
        `}
        startIcon={<RiDownloadLine />}
        onClick={() => setIsPopupOpen(true)}
      />
    </div>
  );
};

export default DownloadAlbumButton;
