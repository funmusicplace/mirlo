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
import LoadingSpinner from "./LoadingSpinner";

const formats = ["flac", "wav", "opus", "320.mp3", "256.mp3", "128.mp3"];

const DownloadAlbumButton: React.FC<{
  trackGroup: TrackGroup;
  onlyIcon?: boolean;
  token?: string;
  email?: string;
}> = ({ trackGroup, onlyIcon, email, token }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [chosenFormat, setChosenFormat] = React.useState(formats[0]);
  const [isGeneratingAlbum, setIsGeneratingAlbum] = React.useState(0);
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const snackbar = useSnackbar();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { state } = useArtistContext();

  const downloadAlbum = React.useCallback(async () => {
    try {
      setIsDownloading(true);
      const queryParams = new URLSearchParams();
      queryParams.append("format", chosenFormat);
      if (email) {
        queryParams.append("email", email);
      }
      if (token) {
        queryParams.append("token", token);
      }
      const resp = await api.downloadFileDirectly(
        `trackGroups/${trackGroup.id}/download?${queryParams.toString()}`,
        `${trackGroup.title.replaceAll(".", "-")}.zip`
      );
      if (resp) {
        if ((resp as any).result.jobId) {
          setIsGeneratingAlbum(+(resp as any).result.jobId);
        }
      }
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  }, [
    chosenFormat,
    email,
    snackbar,
    t,
    token,
    trackGroup.id,
    trackGroup.title,
  ]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGeneratingAlbum > 0) {
      interval = setInterval(async () => {
        const result = await api.getMany<{ jobStatus: string }>(
          `jobs?queue=generateAlbum&ids=${isGeneratingAlbum}`
        );
        if (result.results[0]?.jobStatus === "completed") {
          await api.downloadFileDirectly(
            `trackGroups/${trackGroup.id}/download?format=${chosenFormat}`,
            `${trackGroup.title}.zip`
          );
          setIsDownloading(false);
          setIsGeneratingAlbum(0);
          interval && clearInterval(interval);
        }
      }, 4000);
    }
    return () => (interval ? clearInterval(interval) : undefined);
  }, [chosenFormat, isGeneratingAlbum, trackGroup.id, trackGroup.title]);

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
        <div
          className={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <p>What file type do you want to download?</p>
          <Select
            value={chosenFormat}
            onChange={(e) => setChosenFormat(e.target.value)}
            options={formats.map((format) => ({
              value: format,
              label: format,
            }))}
            disabled={isGeneratingAlbum > 0}
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
            disabled={isGeneratingAlbum > 0}
          >
            Download
          </Button>
          {isGeneratingAlbum > 0 && (
            <p
              className={css`
                margin-top: 1rem;

                svg {
                  margin-right: 0.5rem;
                }
              `}
            >
              <LoadingSpinner />
              We're generating the album! Hold on for a minute...
            </p>
          )}
        </div>
      </Modal>
      <Button
        onlyIcon={onlyIcon}
        className={css`
          margin-top: 0rem;
          font-size: 1.2rem;
          background: transparent;
          color: var(--mi-primary-color);
          margin-left: 0.2rem;
        `}
        startIcon={<RiDownloadLine />}
        onClick={() => setIsPopupOpen(true)}
      >
        {onlyIcon ? "" : "Download"}
      </Button>
    </div>
  );
};

export default DownloadAlbumButton;
