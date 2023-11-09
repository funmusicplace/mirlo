import { css } from "@emotion/css";
import { bp } from "../../constants";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import PostContent from "../common/PostContent";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";

const artistsectionClass = css`

  background: var(--mi-light-background-color);
  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem !important;
    background: var(--mi-light-background-color);
  }
`;

function Artist() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist, isLoading },
  } = useArtistContext();

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <>
      <ArtistAlbums artist={artist} />
      <div className={artistsectionClass}>
        <ArtistSupport artist={artist} />
      </div>
      <div className={artistsectionClass}>
        <h2>{t("updates")}</h2>

        {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
        {artist.posts?.map((p) => (
          <Box
            key={p.id}
            className={css`
              margin-bottom: 1rem;
              margin-top: 1rem;
              padding-top: 1.5rem;

              &:not(:first-child) {
                border-top: 1px solid var(--mi-shade-background-color);
              }
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;
              `}
            >
              <h5>{p.title}</h5>
            </div>
            <PostContent content={p.content} />
          </Box>
        ))}
      </div>
    </>
  );
}

export default Artist;
