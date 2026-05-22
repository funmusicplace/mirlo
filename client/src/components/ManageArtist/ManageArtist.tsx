import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { useTransparentContainer } from "components/ArtistColorsProvider";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { queryManagedArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { TabConfig, TabId, sortTabsByOrder } from "utils/artistTabs";

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const transparent = useTransparentContainer();

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

  const allTabs: TabConfig[] = [
    {
      id: "roster",
      label: rosterTitle,
      visible: !!artist.isLabelProfile,
      to: "roster",
    },
    {
      id: "releases",
      label: releasesTitle,
      visible: true,
      to: "releases",
    },
    {
      id: "posts",
      label: postsTitle,
      visible: true,
      to: "posts",
    },
    {
      id: "support",
      label: supportTitle,
      visible: true,
      to: "tiers",
    },
    {
      id: "merch",
      label: merchTitle,
      visible: true,
      to: "merch",
    },
  ];

  const tabs = sortTabsByOrder(
    allTabs,
    artist.properties?.tabOrder as TabId[] | undefined
  );

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
          <ArtistTabs>
            {tabs
              .filter((tab) => tab.visible)
              .map((tab) => (
                <li key={tab.id}>
                  <NavLink to={tab.to}>{tab.label}</NavLink>
                </li>
              ))}
          </ArtistTabs>
        </nav>
      )}
      {/* Negative padding to keep a consistent look despite the initial padding happening at container level */}
      <div
        className={
          transparent
            ? "bg-(--mi-background-color) -mx-8 -mb-8 px-8 pb-8 max-md:m-0 max-md:p-0"
            : ""
        }
      >
        <Outlet />
      </div>
    </>
  );
};

export default ManageArtist;
