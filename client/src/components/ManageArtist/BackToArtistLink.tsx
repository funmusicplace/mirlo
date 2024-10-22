import { css } from "@emotion/css";
import Tooltip from "components/common/Tooltip";
import { useTranslation } from "react-i18next";
import { FaChevronLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useArtistContext } from "state/ArtistContext";

const BackToArtistLink = () => {
  const {
    state: { artist },
  } = useArtistContext();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist) {
    return null;
  }

  return (
    <Tooltip hoverText={t("backToArtist")} underline={false}>
      <Link
        className={css`
          display: flex;
          align-items: center;
          font-size: 1.2rem;
          padding-bottom: 1rem;
        `}
        to={`/manage/artists/${artist.id}/`}
      >
        <FaChevronLeft
          className={css`
            margin-right: 0.5rem;
            font-size: 1.2rem;
          `}
        />
        {artist.name}
      </Link>
    </Tooltip>
  );
};

export default BackToArtistLink;
