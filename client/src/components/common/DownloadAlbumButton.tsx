import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useTranslation } from "react-i18next";
import { RiDownloadLine } from "react-icons/ri";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import { DropdownMenuItemButton } from "./DropdownMenuItem";
import { FixedButton } from "./FixedButton";
import LoadingSpinner from "./LoadingSpinner";
import Modal from "./Modal";

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
  const [readyFormats, setReadyFormats] = React.useState<Set<string>>(
    new Set()
  );
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
    const fallbackName = `${trackGroup.artist?.name ?? "album"} - ${
      trackGroup.title ?? "album"
    }.zip`;

    setIsDownloading(true);
    try {
      const result = await api.downloadFile(endpoint, { fallbackName });
      if (!result.ok) {
        snackbar(result.error || t("downloadFailed"), { type: "warning" });
        return;
      }
      setChosenFormat("");
      setIsPopupOpen(false);
    } catch (e) {
      console.error("[DownloadAlbumButton] downloadFile threw", e);
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
          setReadyFormats((prev) => new Set(prev).add(format));
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
          setReadyFormats((prev) => new Set(prev).add(chosenFormat));
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
        <div className="flex flex-col text-center">
          {!chosenFormat && !isDownloading ? (
            <>
              <p>{t("downloadFiletypeQuery")}</p>
              <ul className="list-none">
                {formats.map((format) => (
                  <li key={format}>
                    <ArtistButton
                      size="compact"
                      className="text-xl w-1/2 bg-transparent my-2 mx-auto"
                      onClick={async () => {
                        setChosenFormat(format);
                        if (!readyFormats.has(format)) {
                          await generateAlbum(format);
                        }
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
                <p className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="small" />
                  {t("downloadButtonGenerating")}
                </p>
              ) : (
                <ArtistButton
                  size="compact"
                  className="mt-2 text-xl bg-transparent"
                  isLoading={isDownloading}
                  disabled={isDownloading}
                  onClick={downloadFile}
                >
                  {t("download")}
                </ArtistButton>
              )}
              <p>
                <ArtistButton
                  className="my-4 mx-auto"
                  onClick={() => setChosenFormat("")}
                >
                  {t("chooseAnotherFormat")}
                </ArtistButton>
              </p>
            </>
          )}
        </div>
      </Modal>
      {fixed ? (
        <FixedButton
          data-testid="download-button"
          rounded
          size="compact"
          variant="dashed"
          endIcon={<RiDownloadLine />}
          onClick={() => {
            setChosenFormat("");
            setIsPopupOpen(true);
          }}
        >
          {t("download")}
        </FixedButton>
      ) : dropdownItem ? (
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
          className="mt-0 text-xl bg-transparent text-[var(--mi-button-color)]"
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
