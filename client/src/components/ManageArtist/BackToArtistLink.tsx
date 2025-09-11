import { css } from "@emotion/css";
import ArtistRouterLink, {
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Tooltip from "components/common/Tooltip";
import { useTranslation } from "react-i18next";
import { FaChevronLeft } from "react-icons/fa";
import useArtistQuery from "utils/useArtistQuery";

const BackToArtistLink: React.FC<{ subPage?: "posts" | "releases" }> = ({
  subPage,
}) => {
  const { data: artist } = useArtistQuery();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist) {
    return null;
  }

  return (
    <Tooltip hoverText={t("backToArtist")} underline={false}>
      <ArtistButtonLink
        className={css`
          display: flex;
          align-items: center;
          font-size: 1.2rem;
        `}
        variant="link"
        startIcon={<FaChevronLeft />}
        to={`/manage/artists/${artist.id}/${subPage ?? ""}`}
      >
        {artist.name}
      </ArtistButtonLink>
    </Tooltip>
  );
};

export default BackToArtistLink;
