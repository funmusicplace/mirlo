import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import { useTransparentContainer } from "components/ArtistColorsProvider";
import Box from "components/common/Box";
import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import ScrollMoreButton from "components/common/ScrollMoreButton";
import { ArtistTabs } from "components/common/Tabs";
import {
  navbarLinkStripStyles,
  renderArtistLinkButtons,
} from "components/ManageArtist/ArtistFormLinks";
import { queryManagedArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { TabConfig, TabId, sortTabsByOrder } from "utils/artistTabs";
import { transformFromLinks } from "utils/links";
import { useScrollActiveTabIntoView } from "utils/useScrollActiveTabIntoView";

import { bp } from "../../constants";

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const transparent = useTransparentContainer();

  const { artistId } = useParams();
  const reactId = React.useId();
  const scrollId = `manage-artist-nav-scroll-${reactId.replace(/:/g, "")}`;
  const linksScrollId = `manage-artist-links-scroll-${reactId.replace(/:/g, "")}`;
  useScrollActiveTabIntoView(scrollId);

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
          <div
            className={css`
              display: contents;
              @media screen and (min-width: ${Number(bp.medium) + 1}px) {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 1rem;
              }
            `}
          >
            <div className="relative max-md:flex-1 max-md:min-w-0 md:shrink-0">
              <ArtistTabs
                id={scrollId}
                className="whitespace-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {tabs
                  .filter((tab) => tab.visible)
                  .map((tab) => (
                    <li key={tab.id}>
                      <NavLink to={tab.to}>{tab.label}</NavLink>
                    </li>
                  ))}
              </ArtistTabs>
              <ScrollFadeOverlay
                scrollElementId={scrollId}
                position="left"
                size="2rem"
              />
              <ScrollFadeOverlay
                scrollElementId={scrollId}
                position="right"
                size="2rem"
              />
            </div>
            <div className="max-md:hidden flex-[1_1_auto] min-w-0 flex items-center gap-2">
              <ScrollMoreButton
                scrollElementId={linksScrollId}
                position="left"
                ariaLabel={t("scrollLinksLeft")}
              />
              <div className="relative min-w-0 flex-1">
                <div id={linksScrollId} className={navbarLinkStripStyles}>
                  {renderArtistLinkButtons(
                    transformFromLinks(artist).linkArray.filter(
                      (l) => l.inHeader
                    )
                  )}
                </div>
                <ScrollFadeOverlay
                  scrollElementId={linksScrollId}
                  position="left"
                  size="2rem"
                />
                <ScrollFadeOverlay
                  scrollElementId={linksScrollId}
                  position="right"
                  size="2rem"
                />
              </div>
              <ScrollMoreButton
                scrollElementId={linksScrollId}
                position="right"
                ariaLabel={t("scrollLinksRight")}
              />
              <ArtistButtonLink
                to={`/manage/artists/${artist.id}/links`}
                size="compact"
                variant="dashed"
                startIcon={<FaPen />}
                className="shrink-0"
              >
                {t("manageLinks")}
              </ArtistButtonLink>
            </div>
          </div>
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
