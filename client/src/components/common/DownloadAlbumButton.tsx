import Button from "components/common/Button";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { RiDownloadLine } from "react-icons/ri";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useArtistContext } from "state/ArtistContext";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import { ArtistButton } from "components/Artist/ArtistButtons";

const formats = ["flac", "wav", "opus", "320.mp3", "256.mp3", "128.mp3"];
const formatsDisplay: { [format: string]: string } = {
  "": "",
  flac: "FLAC",
  wav: "WAV",
  opus: "OPUS",
  "320.mp3": "MP3 320kbps",
  "256.mp3": "MP3 256kbps",
  "128.mp3": "MP3 128kbps",
};

const DownloadAlbumButton: React.FC<{
  trackGroup: TrackGroup;
  onlyIcon?: boolean;
  token?: string;
  email?: string;
}> = ({ trackGroup, onlyIcon, email, token }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [chosenFormat, setChosenFormat] = React.useState("");
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

  const generateAlbum = React.useCallback(
    async (format: string) => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("format", format);
        const resp = await api.generateDownload(
          `trackGroups/${trackGroup.id}/generate?${queryParams.toString()}`
        );
        if ((resp as any).result.jobId) {
          setIsGeneratingAlbum(+(resp as any).result.jobId);
        } else if ((resp as any).result === true) {
          setIsGeneratingAlbum(0);
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      }
    },
    [chosenFormat, trackGroup.id, t]
  );

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGeneratingAlbum > 0) {
      interval = setInterval(async () => {
        const result = await api.getMany<{ jobStatus: string }>(
          `jobs?queue=generateAlbum&ids=${isGeneratingAlbum}`
        );
        if (result.results[0]?.jobStatus === "completed") {
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
        title={`${t("download")} ${formatsDisplay[chosenFormat]}`}
        open={isPopupOpen}
        size="small"
        onClose={() => setIsPopupOpen(false)}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
            text-align: center;
          `}
        >
          {!chosenFormat && !isDownloading ? (
            <>
              <p>{t("downloadFiletypeQuery")}</p>
              <ul
                className={css`
                  list-style-type: none;
                `}
              >
                {formats.map((format) => (
                  <li key={format}>
                    <Button
                      size="compact"
                      className={css`
                        margin-top: 0.5rem;
                        font-size: 1.2rem;
                        width: 50%;
                        background: transparent;
                        margin: 0.5rem auto;
                      `}
                      onClick={async () => {
                        setChosenFormat(format);
                        await generateAlbum(format);
                      }}
                    >
                      {formatsDisplay[format]}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <ArtistButton
                size="compact"
                className={css`
                  margin-top: 0.5rem;
                  font-size: 1.2rem;
                  background: transparent;
                `}
                isLoading={isDownloading}
                onClick={async () => {
                  await downloadAlbum();
                  setIsPopupOpen(false);
                }}
                disabled={isGeneratingAlbum > 0}
              >
                {isGeneratingAlbum > 0 ? (
                  <p
                    className={css`
                      svg {
                        margin-right: 0.5rem;
                      }
                    `}
                  >
                    <LoadingSpinner />
                    {t("downloadButtonGenerating")}
                  </p>
                ) : (
                  t("download")
                )}
              </ArtistButton>
              <p>
                <ArtistButton
                  className={css`
                    margin-top: 1rem;
                  `}
                  onClick={() => setChosenFormat("")}
                >
                  {t("chooseAnotherFormat")}
                </ArtistButton>
              </p>
            </>
          )}
        </div>
      </Modal>
      <ArtistButton
        onlyIcon={onlyIcon}
        className={css`
          margin-top: 0rem;
          font-size: 1.2rem;
          background: transparent;
          color: var(--mi-primary-color);
        `}
        startIcon={<RiDownloadLine />}
        onClick={() => {
          setChosenFormat("");
          setIsPopupOpen(true);
        }}
      >
        {onlyIcon ? "" : "Download"}
      </ArtistButton>
    </div>
  );
};

export default DownloadAlbumButton;
