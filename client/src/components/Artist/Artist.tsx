import { css } from "@emotion/css";
import { bp } from "../../constants";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import MarkdownContent from "../common/MarkdownContent";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";

export const ArtistSection = styled.div`
  margin-top: 2rem;
  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem !important;
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
      <ArtistSection>
        <ArtistSupport artist={artist} />
      </ArtistSection>
      <ArtistSection>
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
            <MarkdownContent content={p.content} />
          </Box>
        ))}
      </ArtistSection>
    </>
  );
}

export default Artist;
