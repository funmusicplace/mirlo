import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";

import { DropdownMenuItemLink } from "../DropdownMenuItem";

const GoToTrack: React.FC<{
  track: Track;
  artist: Artist;
  trackGroup: TrackGroup;
}> = ({ artist, trackGroup, track }) => {
  const { trackId } = useParams();
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  if (Number(trackId) === track.id) {
    return null;
  }
  return (
    <DropdownMenuItemLink
      to={`${getReleaseUrl(artist, trackGroup)}/tracks/${track.id}`}
      startIcon={<FaArrowRight />}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t("goToTrack")}
    </DropdownMenuItemLink>
  );
};

export default GoToTrack;
