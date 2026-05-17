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
import { DropdownMenuItemButton } from "./DropdownMenuItem";
import useErrorHandler from "services/useErrorHandler";

const formats = ["flac", "wav", "128.opus", "320.mp3", "256.mp3", "128.mp3"];
const formatsDisplay: { [format: string]: string } = {
  "": "",
  flac: "FLAC",
  wav: "WAV",
  "128.opus": "OPUS 128kbps",
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
  fixed?: boolean;
  dropdownItem?: boolean;
}> = ({ trackGroup, onlyIcon, email, token, track, fixed, dropdownItem }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const [chosenFormat, setChosenFormat] = React.useState("");
  const [isGeneratingAlbum, setIsGeneratingAlbum] = React.useState(0);
  const [isCheckingGeneration, setIsCheckingGeneration] = React.useState(false);
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const errorHandler = useErrorHandler();

  const prefix = track ? `tracks/${track.id}` : `trackGroups/${trackGroup.id}`;
  const snackbar = useSnackbar();

  const downloadFile = React.useCallback(async () => {
    const queryParams = new URLSearchParams();
    queryParams.append("format", chosenFormat);
    if (email) {
      queryParams.append("email", email);
    }
    if (token) {
      queryParams.append("token", token);
    }
    const endpoint = `${prefix}/download?${queryParams.toString()}`;

    setIsDownloading(true);
    try {
      // Go through apiRequest so cookies + the mirlo-api-key header are sent.
      // noProcess gives us the raw Response so we can read the blob (or the
      // error JSON) without the helper trying to JSON.parse a binary stream.
      const resp = await api.request<Response>(
        endpoint,
        { method: "GET", credentials: "include" },
        { noProcess: true }
      );

      if (!resp.ok) {
        let errorMessage = "";
        try {
          const errJson = await resp.json();
          if (typeof errJson?.error === "string") {
            errorMessage = errJson.error;
          } else if (errJson?.error) {
            errorMessage = JSON.stringify(errJson.error);
          }
        } catch {
          // body wasn't JSON; fall back to a generic message
        }
        snackbar(errorMessage || t("downloadFailed"), { type: "warning" });
        return;
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      const fallbackName = `${trackGroup.artist?.name ?? "album"} - ${
        trackGroup.title ?? "album"
      }.zip`;
      // Prefer the server's filename if it sent one
      const disposition = resp.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^"';]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : fallbackName;

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setChosenFormat("");
      setIsPopupOpen(false);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsDownloading(false);
    }
  }, [
    chosenFormat,
    email,
    errorHandler,
    prefix,
    snackbar,
    t,
    token,
    trackGroup.artist?.name,
    trackGroup.title,
  ]);

  const generateAlbum = React.useCallback(
    async (format: string) => {
      setIsCheckingGeneration(true);
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
        errorHandler(e);
      } finally {
        setIsCheckingGeneration(false);
      }
    },
    [chosenFormat, trackGroup.id, t, prefix, errorHandler]
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
    <>
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
              {isCheckingGeneration || isGeneratingAlbum > 0 ? (
                <p
                  className={css`
                    svg {
                      margin-right: 0 auto;
                    }
                  `}
                >
                  <LoadingSpinner size="small" />
                  {t("downloadButtonGenerating")}
                </p>
              ) : (
                <ArtistButton
                  size="compact"
                  className={css`
                    margin-top: 0.5rem;
                    font-size: 1.2rem;
                    background: transparent;
                  `}
                  isLoading={isDownloading}
                  disabled={isDownloading}
                  onClick={downloadFile}
                >
                  {t("download")}
                </ArtistButton>
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
      {dropdownItem ? (
        <DropdownMenuItemButton
          data-testid="download-button"
          startIcon={<RiDownloadLine />}
          onClick={(e) => {
            e.stopPropagation();
            setChosenFormat("");
            setIsPopupOpen(true);
          }}
        >
          {t("download")}
        </DropdownMenuItemButton>
      ) : (
        <ArtistButton
          onlyIcon={onlyIcon}
          data-testid="download-button"
          className={css`
            margin-top: 0;
            font-size: 1.2rem;
            background: transparent;
            color: var(--mi-button-color);
          `}
          startIcon={<RiDownloadLine />}
          onClick={() => {
            setChosenFormat("");
            setIsPopupOpen(true);
          }}
        >
          {onlyIcon ? "" : t("download")}
        </ArtistButton>
      )}
    </>
  );
};

export default DownloadAlbumButton;
