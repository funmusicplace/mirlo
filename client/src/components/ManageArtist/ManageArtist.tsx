import { css } from "@emotion/css";
import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { ArtistSection } from "components/Artist/Artist";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist } from "queries";
import { AiOutlineWarning } from "react-icons/ai";
import { useAuthContext } from "state/AuthContext";

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId } = useParams();

  const { user } = useAuthContext();

  const { data: artist, isError } = useQuery(
    queryManagedArtist(Number(artistId))
  );

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
      <Outlet />
    </>
  );
};

export default ManageArtist;
