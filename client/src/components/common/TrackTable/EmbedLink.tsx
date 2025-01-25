import { css } from "@emotion/css";
import Button from "../Button";
import { widgetUrl } from "utils/tracks";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { ImEmbed } from "react-icons/im";

const EmbedLink: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
}) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  return (
    <Button
      size="compact"
      transparent
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(widgetUrl(track.id, "track"));
        snackbar(t("copiedTrackUrl"), { type: "success" });
      }}
      startIcon={<ImEmbed />}
      className={css`
        .startIcon {
          padding-left: 1rem;
        }
        :hover {
          background: transparent !important;
          opacity: 0.6;
        }
      `}
    >
      {t("embedCode")}
    </Button>
  );
};

export default EmbedLink;
