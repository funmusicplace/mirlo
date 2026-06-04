import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { BsShare } from "react-icons/bs";
import { FaCopy } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import {
  getArtistUrl,
  getLabelWidget,
  getReleaseUrl,
  getTrackGroupWidget,
  getTrackUrl,
  getTrackWidget,
} from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

export const widgetIframeHtml = (src: string, height: number = 230) => `<iframe
    src="${src}"
    style="width:100%; height: ${height}px; border:0; border-radius: 4px; overflow:hidden;"
    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
  ></iframe>`;

type VariantOption = { key: string; height: number; labelKey: string };

const Embed: React.FC<{
  title?: string;
  url?: string;
  src?: string;
  buttonClassName?: string;
  translationString?: string;
  height?: number;
  variants?: VariantOption[];
}> = ({
  title,
  url,
  src,
  buttonClassName,
  translationString = "copyAlbum",
  height,
  variants,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupEmbed" });
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState(
    variants?.[0]?.key
  );
  const snackbar = useSnackbar();
  const variantGroupId = React.useId();
  const variantRadioName = `${variantGroupId}-radio`;

  const currentVariant = variants?.find((v) => v.key === selectedVariant);
  const effectiveSrc =
    variants && selectedVariant && src
      ? `${src}${src.includes("?") ? "&" : "?"}variant=${selectedVariant}`
      : src;
  const effectiveHeight = currentVariant?.height ?? height;

  return (
    <div>
      <Modal
        title={t("embed", { name: title }) ?? ""}
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        size="medium"
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
              font-size: 0.875rem;
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

          {variants && variants.length > 1 && (
            <>
              <div
                role="radiogroup"
                aria-label={t("chooseLayout") ?? ""}
                className={css`
                  display: flex;
                  gap: 1rem;
                  margin: 0.5rem 0;
                  flex-wrap: wrap;
                `}
              >
                {variants.map((v) => (
                  <label
                    key={v.key}
                    className={css`
                      display: inline-flex;
                      align-items: center;
                      gap: 0.35rem;
                      cursor: pointer;
                    `}
                  >
                    <input
                      type="radio"
                      name={variantRadioName}
                      value={v.key}
                      checked={selectedVariant === v.key}
                      onChange={() => setSelectedVariant(v.key)}
                    />
                    {t(v.labelKey)}
                  </label>
                ))}
              </div>
              {currentVariant && effectiveSrc && (
                <iframe
                  key={currentVariant.key}
                  src={effectiveSrc}
                  title={t("embedPreview") ?? ""}
                  style={{
                    width: "100%",
                    height: `${effectiveHeight}px`,
                    border: 0,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                />
              )}
            </>
          )}

          <p>{t("copyIframe")}</p>
          <code
            onClick={() => {
              navigator.clipboard.writeText(
                widgetIframeHtml(effectiveSrc ?? "", effectiveHeight)
              );
              snackbar(t("copiedToClipboard"), { type: "success" });
            }}
          >
            {widgetIframeHtml(effectiveSrc ?? "", effectiveHeight)}
            <FaCopy />
          </code>
        </div>
      </Modal>
      <div>
        <ArtistButton
          title={t("embedOrShare") ?? ""}
          onClick={() => setIsPopupOpen(true)}
          startIcon={<BsShare />}
          className={
            css`
              margin-top: 0rem;
              font-size: 1.2rem;
            ` +
            " " +
            (buttonClassName ?? "")
          }
        />
      </div>
    </div>
  );
};

export const TrackEmbed: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
}> = ({ track, trackGroup }) => {
  const { data: artist } = useArtistQuery();

  if (!track || !artist) {
    return null;
  }

  const trackWidget = getTrackWidget(track.id);

  return (
    <Embed
      title={track.title}
      url={getTrackUrl(artist, trackGroup, track)}
      src={trackWidget}
      variants={[
        { key: "card", height: 130, labelKey: "variantCard" },
        { key: "strip", height: 120, labelKey: "variantStrip" },
      ]}
    />
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
      variants={[
        { key: "card", height: 230, labelKey: "variantCard" },
        { key: "compact", height: 140, labelKey: "variantStrip" },
        { key: "strip", height: 230, labelKey: "variantStripWithTracklist" },
      ]}
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
      height={230}
    />
  );
};

export default TrackGroupEmbed;
