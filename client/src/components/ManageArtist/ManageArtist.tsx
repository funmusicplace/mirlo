import { css } from "@emotion/css";
import React from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist } from "queries";

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
            <NavLink to="releases">{t("releases")}</NavLink>
          </li>
          <li>
            <NavLink to="posts">{t("updates")}</NavLink>
          </li>
          {artist && (
            <li>
              <NavLink to="tiers">
                {t("support", { artist: artist.name })}
              </NavLink>
            </li>
          )}
          {artist && (
            <li>
              <NavLink to="merch">{t("merch")}</NavLink>
            </li>
          )}
        </ArtistTabs>
      )}
      <Outlet />
    </>
  );
};

export default ManageArtist;
