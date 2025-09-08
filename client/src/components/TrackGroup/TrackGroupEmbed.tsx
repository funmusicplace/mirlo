import Button from "components/common/Button";
import React from "react";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import Modal from "components/common/Modal";
import {
  getArtistUrl,
  getLabelWidget,
  getReleaseUrl,
  getTrackGroupWidget,
} from "utils/artist";
import { FaCopy } from "react-icons/fa";
import { BsShare } from "react-icons/bs";
import { useSnackbar } from "state/SnackbarContext";
import { ArtistButton } from "components/Artist/ArtistButtons";
import useArtistQuery from "utils/useArtistQuery";

const Embed: React.FC<{
  title?: string;
  url?: string;
  src?: string;
  buttonClassName?: string;
  translationString?: string;
}> = ({
  title,
  url,
  src,
  buttonClassName,
  translationString = "copyAlbum",
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupEmbed" });
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const snackbar = useSnackbar();

  const widgetText = `<iframe
    src="${src}"
    style="width:100%; height: 371px; border:0; border-radius: 4px; overflow:hidden;"
    allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
  ></iframe>`;

  return (
    <div>
      <Modal
        title={t("embed", { name: title }) ?? ""}
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
              navigator.clipboard.writeText(
                import.meta.env.VITE_CLIENT_DOMAIN + url
              );
              snackbar(t("copiedToClipboard"), { type: "success" });
            }}
          >
            {t(translationString) ?? ""}
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
        <ArtistButton
          onlyIcon
          title={t("embedOrShare") ?? ""}
          onClick={() => setIsPopupOpen(true)}
          startIcon={<BsShare />}
          className={
            css`
              margin-top: 0rem;
              font-size: 1.2rem;
              margin-left: 0.2rem;
            ` +
            " " +
            (buttonClassName ?? "")
          }
        />
      </div>
    </div>
  );
};

const TrackGroupEmbed: React.FC<{
  trackGroup: TrackGroup;
}> = ({ trackGroup }) => {
  const { data: artist } = useArtistQuery();

  if (!trackGroup || !artist) {
    return null;
  }

  const trackGroupWidget = getTrackGroupWidget(trackGroup.id);

  return (
    <Embed
      title={trackGroup.title}
      url={getReleaseUrl(trackGroup.artist, trackGroup)}
      src={trackGroupWidget}
    />
  );
};

export const LabelEmbed: React.FC<{
  label: Artist;
  buttonClassName?: string;
}> = ({ label, buttonClassName }) => {
  const { data: artist } = useArtistQuery();
  if (!label || !artist) {
    return null;
  }

  const labelWidget = getLabelWidget(label.id);

  return (
    <Embed
      title={`${label.name} playlist`}
      url={getArtistUrl(label)}
      src={labelWidget}
      buttonClassName={buttonClassName}
    />
  );
};

export default TrackGroupEmbed;
