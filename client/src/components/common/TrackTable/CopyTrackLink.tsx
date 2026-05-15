import { useTranslation } from "react-i18next";
import { FaLink } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { getReleaseUrl } from "utils/artist";

import { DropdownMenuItemButton } from "../DropdownMenuItem";

const CopyTrackLink: React.FC<{
  track: Track;
  artist: Artist;
  trackGroup: TrackGroup;
}> = ({ artist, trackGroup, track }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <DropdownMenuItemButton
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(
          `${import.meta.env.VITE_CLIENT_DOMAIN}${getReleaseUrl(artist, trackGroup)}/tracks/${track.id}`
        );
        snackbar(t("copiedTrackLink"), { type: "success" });
      }}
      startIcon={<FaLink />}
    >
      {t("copyTrackLink")}
    </DropdownMenuItemButton>
  );
};

export default CopyTrackLink;
