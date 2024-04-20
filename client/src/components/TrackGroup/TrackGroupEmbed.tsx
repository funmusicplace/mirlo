import Button from "components/common/Button";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import Modal from "components/common/Modal";
import { getReleaseUrl, getTrackGroupWidget } from "utils/artist";
import { FaCopy } from "react-icons/fa";
import { BsShare } from "react-icons/bs";
import { useSnackbar } from "state/SnackbarContext";

const TrackGroupEmbed: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupEmbed" });
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const snackbar = useSnackbar();
  const { state } = useArtistContext();

  if (!trackGroup || !state?.artist) {
    return null;
  }

  const trackGroupWidget = getTrackGroupWidget(trackGroup.id);

  const widgetText = `<iframe
    src="${trackGroupWidget}"
    style="width:100%; height: 300px; border:0; border-radius: 4px; overflow:hidden;"
    allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
  ></iframe>`;

  return (
    <div>
      <Modal
        title={t("embed", { name: trackGroup.title }) ?? ""}
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;

            p {
              margin: 0.75rem 0;
            }

            code {
              padding: 1rem;
              background-color: black;
              color: white;
              margin-bottom: 0.75rem;
              cursor: pointer;
              position: relative;
              overflow: auto;

              svg {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
              }
            }
          `}
        >
          <Button
            onClick={() => {
              if (trackGroup.artist) {
                navigator.clipboard.writeText(
                  process.env.REACT_APP_CLIENT_DOMAIN +
                    getReleaseUrl(trackGroup.artist, trackGroup)
                );
                snackbar(t("copiedToClipboard"), { type: "success" });
              }
            }}
          >
            {t("copyAlbum")}
          </Button>

          <p>{t("copyIframe")}</p>
          <code
            onClick={() => {
              navigator.clipboard.writeText(widgetText);
              snackbar(t("copiedToClipboard"), { type: "success" });
            }}
          >
            {widgetText}
            <FaCopy />
          </code>
        </div>
      </Modal>
      <div>
        <Button
          onlyIcon
          onClick={() => setIsPopupOpen(true)}
          className={css`
            margin-top: 0rem;
            font-size: 1.2rem;
            background: transparent;
            color: var(--mi-primary-color);
            margin-left: 0.2rem;
          `}
        >
          <BsShare />
        </Button>
      </div>
    </div>
  );
};

export default TrackGroupEmbed;
