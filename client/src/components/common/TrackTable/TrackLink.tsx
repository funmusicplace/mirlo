import { css } from "@emotion/css";
import { ButtonLink } from "../Button";

import { FaLink } from "react-icons/fa";
import { getReleaseUrl } from "utils/artist";
import { useTranslation } from "react-i18next";

const TrackLink: React.FC<{
  track: Track;
  artist: Artist;
  trackGroup: TrackGroup;
}> = ({ artist, trackGroup, track }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
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
