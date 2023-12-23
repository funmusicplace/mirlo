import { bp } from "../../constants";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";
import { NavLink, Outlet } from "react-router-dom";
import Tabs from "components/common/Tabs";

export const ArtistSection = styled.div`
  margin-bottom: 2rem;
  margin-top: 2rem;

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
      <Tabs>
        <li>
          <NavLink to="releases">{t("releases")}</NavLink>
        </li>
        <li>
          <NavLink to="posts">{t("updates")}</NavLink>
        </li>
        <li>
          <NavLink to="support">
            {t("support", { artist: artist.name })}
          </NavLink>
        </li>
      </Tabs>
      <ArtistSection>
        <Outlet />
      </ArtistSection>
    </>
  );
}

export default Artist;
