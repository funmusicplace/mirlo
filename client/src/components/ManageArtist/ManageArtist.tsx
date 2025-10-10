import { css } from "@emotion/css";
import React from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist } from "queries";
import { getArtistUrl } from "utils/artist";
import { ArtistButtonQuickLink } from "components/Artist/Artist";
import { FaEye } from "react-icons/fa";

export type ManageArtistOutletContext = {
  artist: Artist;
};

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId } = useParams();

  const { data: artist, isError } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { pathname } = useLocation();
  const isCustomizePage =
    pathname.includes("/manage/artists") && pathname.includes("customize");
  if (isError) {
    return <Box>{t("doesNotExist")}</Box>;
  }

  if (!artist) {
    return null;
  }

  return (
    <>
      {artist && !artist.enabled && (
        <div
          className={css`
            background-color: var(--mi-warning-background-color);
            padding: 1rem;
            color: var(--mi-warning-text-color);
          `}
        >
          {t("notEnabled")}
        </div>
      )}

      {!isCustomizePage && (
        <ArtistTabs color={artist.properties?.colors.primary}>
          <li>
            <NavLink to="releases">
              {artist.properties?.titles?.releases || t("releases")}
            </NavLink>
            <ArtistButtonQuickLink
              to={getArtistUrl(artist) + "/releases"}
              icon={<FaEye />}
            />
          </li>
          <li>
            <NavLink to="posts">
              {artist.properties?.titles?.posts || t("updates")}
            </NavLink>{" "}
            <ArtistButtonQuickLink
              to={getArtistUrl(artist) + "/posts"}
              icon={<FaEye />}
            />
          </li>
          {artist && (
            <li>
              <NavLink to="tiers">
                {artist.properties?.titles?.support || t("support")}
              </NavLink>
              <ArtistButtonQuickLink
                to={getArtistUrl(artist) + "/support"}
                icon={<FaEye />}
              />
            </li>
          )}
          {artist && (
            <li>
              <NavLink to="merch">
                {artist.properties?.titles?.merch || t("merch")}
              </NavLink>
              <ArtistButtonQuickLink
                to={getArtistUrl(artist) + "/merch"}
                icon={<FaEye />}
              />
            </li>
          )}
          {artist && artist.isLabelProfile && (
            <li>
              <NavLink to="/profile/label">
                {artist.properties?.titles?.roster || t("roster")}
              </NavLink>
              <ArtistButtonQuickLink
                to={getArtistUrl(artist) + "/roster"}
                icon={<FaEye />}
              />
            </li>
          )}
        </ArtistTabs>
      )}
      <Outlet context={{ artist }} />
    </>
  );
};

export default ManageArtist;
