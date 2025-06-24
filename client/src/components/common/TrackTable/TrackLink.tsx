import { css } from "@emotion/css";
import { ButtonLink } from "../Button";

import { FaLink } from "react-icons/fa";
import { getReleaseUrl } from "utils/artist";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const TrackLink: React.FC<{
  track: Track;
  artist: Artist;
  trackGroup: TrackGroup;
}> = ({ artist, trackGroup, track }) => {
  const { trackId } = useParams();
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  // If we're looking at the current track, don't show the link
  if (Number(trackId) === track.id) {
    return null;
  }
  return (
    <ButtonLink
      size="compact"
      variant="transparent"
      to={`${getReleaseUrl(artist, trackGroup)}/tracks/${track.id}`}
      startIcon={<FaLink />}
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
      {t("viewTrack")}
    </ButtonLink>
  );
};

export default TrackLink;
