import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { RiDownloadLine } from "react-icons/ri";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useArtistContext } from "state/ArtistContext";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import {
  ArtistButton,
  ArtistButtonAnchor,
} from "components/Artist/ArtistButtons";

const formats = ["flac", "wav", "128.opus", "320.mp3", "256.mp3", "128.mp3"];
const formatsDisplay: { [format: string]: string } = {
  "": "",
  flac: "FLAC",
  wav: "WAV",
  "128.opus": "OPUS",
  "320.mp3": "MP3 320kbps",
  "256.mp3": "MP3 256kbps",
  "128.mp3": "MP3 128kbps",
};

const DownloadAlbumButton: React.FC<{
  trackGroup: TrackGroup;
  onlyIcon?: boolean;
  token?: string;
  email?: string;
  track?: Track;
}> = ({ trackGroup, onlyIcon, email, token, track }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [chosenFormat, setChosenFormat] = React.useState("");
  const [isGeneratingAlbum, setIsGeneratingAlbum] = React.useState(0);
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const snackbar = useSnackbar();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const prefix = track ? `tracks/${track.id}` : `trackGroups/${trackGroup.id}`;

  const getDownloadUrl = React.useCallback(() => {
    const queryParams = new URLSearchParams();
    queryParams.append("format", chosenFormat);
    if (email) {
      queryParams.append("email", email);
    }
    if (token) {
      queryParams.append("token", token);
    }

    return api.getFileDownloadUrl(
      `${prefix}/download?${queryParams.toString()}`
    );
  }, [track, trackGroup.id, prefix, chosenFormat, email, token]);

  const generateAlbum = React.useCallback(
    async (format: string) => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("format", format);
        const resp = await api.generateDownload(
          `${prefix}/generate?${queryParams.toString()}`
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
    [chosenFormat, trackGroup.id, t, prefix, snackbar]
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

  if (!trackGroup) {
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
                    <ArtistButton
                      size="compact"
                      className={css`
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
                    </ArtistButton>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
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
                <ArtistButtonAnchor
                  size="compact"
                  className={css`
                    margin-top: 0.5rem;
                    font-size: 1.2rem;
                    background: transparent;
                  `}
                  isLoading={isDownloading}
                  href={getDownloadUrl()}
                  onClick={async () => {
                    setChosenFormat("");
                    setIsPopupOpen(false);
                  }}
                >
                  {t("download")}
                </ArtistButtonAnchor>
              )}
              <p>
                <ArtistButton
                  className={css`
                    margin: 1rem auto;
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
          margin-top: 0;
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
