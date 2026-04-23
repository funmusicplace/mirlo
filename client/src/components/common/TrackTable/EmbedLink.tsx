import { widgetUrl } from "utils/tracks";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { ImEmbed } from "react-icons/im";
import { DropdownMenuItemButton } from "../DropdownMenuItem";

const EmbedLink: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
}) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  return (
    <DropdownMenuItemButton
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(widgetUrl(track.id, "track"));
        snackbar(t("copiedTrackUrl"), { type: "success" });
      }}
      startIcon={<ImEmbed />}
    >
      {t("embedCode")}
    </DropdownMenuItemButton>
  );
};

export default EmbedLink;
