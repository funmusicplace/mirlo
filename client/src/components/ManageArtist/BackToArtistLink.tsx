import { css } from "@emotion/css";
import ArtistRouterLink from "components/Artist/ArtistButtons";
import Tooltip from "components/common/Tooltip";
import { useTranslation } from "react-i18next";
import { FaChevronLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useArtistContext } from "state/ArtistContext";

const BackToArtistLink: React.FC<{ subPage?: "posts" }> = ({ subPage }) => {
  const {
    state: { artist },
  } = useArtistContext();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist) {
    return null;
  }

  return (
    <Tooltip hoverText={t("backToArtist")} underline={false}>
      <ArtistRouterLink
        className={css`
          display: flex;
          align-items: center;
          font-size: 1.2rem;
        `}
        to={`/manage/artists/${artist.id}/${subPage ?? ""}`}
      >
        <FaChevronLeft
          className={css`
            margin-right: 0.5rem;
            font-size: 1.2rem;
          `}
        />
        {artist.name}
      </ArtistRouterLink>
    </Tooltip>
  );
};

export default BackToArtistLink;
