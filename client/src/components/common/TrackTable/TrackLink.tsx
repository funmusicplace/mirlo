import { FaLink } from "react-icons/fa";
import { getReleaseUrl } from "utils/artist";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { DropdownMenuItemLink } from "../DropdownMenuItem";

const TrackLink: React.FC<{
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
      startIcon={<FaLink />}
    >
      {t("viewTrack")}
    </DropdownMenuItemLink>
  );
};

export default TrackLink;
