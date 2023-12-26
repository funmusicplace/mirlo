import { css } from "@emotion/css";
import Tooltip from "components/common/Tooltip";
import { FaChevronLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useArtistContext } from "state/ArtistContext";

const BackToArtistLink = () => {
  const {
    state: { artist },
  } = useArtistContext();

  if (!artist) {
    return null;
  }

  return (
    <Tooltip hoverText="Back to artist" underline={false}>
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
