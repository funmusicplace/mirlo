import { bp } from "../../constants";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Tabs from "components/common/Tabs";
import React from "react";

export const ArtistSection = styled.div`
  margin-bottom: 2rem;
  margin-top: 2rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

function Artist() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const {
    state: { artist, isLoading },
  } = useArtistContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const subPages = ["posts", "releases", "support"];
    const end = pathname.split("/")[2];

    if (!subPages.includes(end)) {
      const navigateTo =
        (artist?.trackGroups.length ?? 0) > 0
          ? "releases"
          : (artist?.posts.length ?? 0) > 0
          ? "posts"
          : "support";
      navigate(navigateTo);
    }
  }, [pathname, navigate, artist?.trackGroups.length, artist?.posts.length]);

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <>
      <Tabs>
        {(artist?.trackGroups.length ?? 0) > 0 && (
          <li>
            <NavLink to="releases">{t("releases")}</NavLink>
          </li>
        )}
        {(artist?.posts.length ?? 0) > 0 && (
          <li>
            <NavLink to="posts">{t("updates")}</NavLink>
          </li>
        )}
        {(artist?.subscriptionTiers.length ?? 0) > 0 && (
          <li>
            <NavLink to="support">
              {t("support", { artist: artist.name })}
            </NavLink>
          </li>
        )}
      </Tabs>
      <ArtistSection>
        <Outlet />
      </ArtistSection>
    </>
  );
}

export default Artist;
