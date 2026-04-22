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

  const releasesTitle = artist.properties?.titles?.releases || t("releases");
  const merchTitle = artist.properties?.titles?.merch || t("merch");
  const postsTitle = artist.properties?.titles?.posts || t("updates");
  const supportTitle = artist.properties?.titles?.support || t("support");
  const rosterTitle = artist.properties?.titles?.roster || t("roster");

  return (
    <>
      {artist && !artist.enabled && (
        <div
          className={css`
            background-color: var(--mi-warning-background-color);
            padding: 1rem;
            margin-top: 1rem;
            color: var(--mi-warning-text-color);
          `}
        >
          {t("notEnabled")}
        </div>
      )}

      {!isCustomizePage && (
        <nav
          aria-label={
            artist.isLabelProfile
              ? t("manageLabelNavigation")
              : t("manageArtistNavigation")
          }
        >
          <ArtistTabs color={artist.properties?.colors?.primary}>
            <li className="tab-primary">
              <NavLink to="releases">{releasesTitle}</NavLink>
            </li>
            <li className="tab-secondary">
              <ArtistButtonQuickLink
                ariaLabel={t("viewLiveTitled", { title: releasesTitle })}
                to={getArtistUrl(artist) + "/releases"}
                icon={<FaEye />}
              />
            </li>
            <li className="tab-primary">
              <NavLink to="posts">{postsTitle}</NavLink>{" "}
            </li>
            <li className="tab-secondary">
              <ArtistButtonQuickLink
                ariaLabel={t("viewLiveTitled", { title: postsTitle })}
                to={getArtistUrl(artist) + "/posts"}
                icon={<FaEye />}
              />
            </li>
            {artist && (
              <>
                <li className="tab-primary">
                  <NavLink to="tiers">{supportTitle}</NavLink>
                </li>
                <li className="tab-secondary">
                  <ArtistButtonQuickLink
                    ariaLabel={t("viewLiveTitled", { title: supportTitle })}
                    to={getArtistUrl(artist) + "/support"}
                    icon={<FaEye />}
                  />
                </li>
              </>
            )}
            {artist && (
              <>
                <li className="tab-primary">
                  <NavLink to="merch">{merchTitle}</NavLink>
                </li>
                <li className="tab-secondary">
                  <ArtistButtonQuickLink
                    ariaLabel={t("viewLiveTitled", { title: merchTitle })}
                    to={getArtistUrl(artist) + "/merch"}
                    icon={<FaEye />}
                  />
                </li>
              </>
            )}
            {artist && artist.isLabelProfile && (
              <>
                <li className="tab-primary">
                  <NavLink to="/profile/label">{rosterTitle}</NavLink>
                </li>
                <li className="tab-secondary">
                  <ArtistButtonQuickLink
                    ariaLabel={t("viewLiveTitled", { title: rosterTitle })}
                    to={getArtistUrl(artist) + "/roster"}
                    icon={<FaEye />}
                  />
                </li>
              </>
            )}
          </ArtistTabs>
        </nav>
      )}
      <Outlet />
    </>
  );
};

export default ManageArtist;
