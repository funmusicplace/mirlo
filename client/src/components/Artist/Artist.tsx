import { bp } from "../../constants";
import ArtistSupport from "./ArtistSupport";
import Box from "../common/Box";
import ArtistAlbums from "./ArtistAlbums";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";
import ArtistPosts from "./ArtistPosts";

export const ArtistSection = styled.div`
  background: var(--mi-light-background-color);
  margin-bottom: 2rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
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
        <ArtistPosts artist={artist} />
      </ArtistSection>
    </>
  );
}

export default Artist;
