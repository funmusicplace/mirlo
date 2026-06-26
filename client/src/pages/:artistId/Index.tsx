import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ScrollFadeOverlay from "components/common/ScrollFadeOverlay";
import ScrollMoreButton from "components/common/ScrollMoreButton";
import { ArtistTabs } from "components/common/Tabs";
import TipArtistModal from "components/common/TipArtistModal";
import {
  navbarLinkStripStyles,
  renderArtistLinkButtons,
} from "components/ManageArtist/ArtistFormLinks";
import {
  queryArtist,
  queryPublicLabelTrackGroups,
  queryUserStripeStatus,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getPaidTierCount, isTipOnlyArtist } from "utils/artist";
import { TabConfig, TabId, sortTabsByOrder } from "utils/artistTabs";
import { transformFromLinks } from "utils/links";
import { useScrollActiveTabIntoView } from "utils/useScrollActiveTabIntoView";

import { bp } from "../../constants";
import Box from "components/common/Box";

export const ArtistSection: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={`mb-8 mt-2 max-md:[padding:var(--mi-side-paddings-xsmall)] max-md:mb-6 ${
      className ?? ""
    }`}
    {...props}
  >
    {children}
  </div>
);

function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const params = useParams();

  const artistId = params?.artistId ?? "";

  const { data: artist, isPending } = useQuery(
    queryArtist({ artistSlug: artistId })
  );

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );
  const { data: releases } = useQuery(queryPublicLabelTrackGroups(artistId));

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReceivePayments = stripeAccountStatus?.chargesEnabled;

  const reactId = React.useId();
  const scrollId = `artist-nav-scroll-${reactId.replace(/:/g, "")}`;
  const linksScrollId = `artist-links-scroll-${reactId.replace(/:/g, "")}`;
  useScrollActiveTabIntoView(scrollId);

  const [isTipModalOpen, setIsTipModalOpen] = React.useState(false);

  const openTipModal = React.useCallback(() => setIsTipModalOpen(true), []);

  const closeTipModal = React.useCallback(() => {
    setIsTipModalOpen(false);
    if (pathname.endsWith("/support")) {
      navigate(`/${artistId}`);
    }
  }, [pathname, navigate, artistId]);

  const atBasePath = !pathname.split("/")[2];

  if (!artist && !isPending) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const isArtistUser = artist.userId === user?.id;
  const releasesTitle = artist.properties?.titles?.releases || t("releases");
  const merchTitle = artist.properties?.titles?.merch || t("merch");
  const postsTitle = artist.properties?.titles?.posts || t("updates");
  const supportTitle =
    artist.properties?.titles?.support || t("support", { artist: artist.name });
  const rosterTitle = artist.properties?.titles?.roster || t("roster");

  const paidTierCount = getPaidTierCount(artist);
  const isTipOnly = isTipOnlyArtist(artist);

  const allTabs: TabConfig[] = [
    {
      id: "roster",
      label: rosterTitle,
      visible:
        artist.isLabelProfile && (artist.user?.artistLabels?.length ?? 0) > 0,
      to: "roster",
    },
    {
      id: "releases",
      label: releasesTitle,
      visible:
        (artist?.trackGroups.length ?? 0) > 0 ||
        (releases?.results.length ?? 0) > 0,
      to: "releases",
      navLinkId: "artist-navlink-releases",
    },
    {
      id: "posts",
      label: postsTitle,
      visible: (artist?.posts.length ?? 0) > 0,
      to: "posts",
      navLinkId: "artist-navlink-updates",
    },
    {
      id: "support",
      label: supportTitle,
      visible: !!canReceivePayments && (paidTierCount > 0 || isTipOnly),
      to: isTipOnly ? "" : "support",
      onClick: isTipOnly ? openTipModal : undefined,
    },
    {
      id: "merch",
      label: merchTitle,
      visible: (artist.merch.length ?? 0) > 0,
      to: "merch",
    },
  ];

  const tabs = sortTabsByOrder(
    allTabs,
    artist.properties?.tabOrder as TabId[] | undefined
  );

  // The section rendered at the artist's home URL: the first tab with content.
  // Tip-only support is skipped — it only opens a modal, so it's a poor landing.
  const defaultSectionId = tabs.find(
    (tab) => tab.visible && !(tab.id === "support" && isTipOnly)
  )?.id;

  const headerLinks = transformFromLinks(artist).linkArray.filter(
    (l) => l.inHeader
  );

  return (
    <>
      <nav
        className="max-md:-mt-2"
        aria-label={
          artist.isLabelProfile ? t("labelNavigation") : t("artistNavigation")
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
                    {tab.onClick ? (
                      <button type="button" onClick={tab.onClick}>
                        {tab.label}
                      </button>
                    ) : (
                      <NavLink
                        to={tab.to}
                        id={tab.navLinkId}
                        className={({ isActive }) =>
                          isActive ||
                          (atBasePath && tab.id === defaultSectionId)
                            ? "active"
                            : ""
                        }
                      >
                        {tab.label}
                      </NavLink>
                    )}
                  </li>
                ))}
              {user && isArtistUser && !canReceivePayments && (
                <li>
                  <a
                    href={api.paymentProcessor.stripeConnect(user.id)}
                    className="!flex items-center [&_svg]:ml-1"
                  >
                    {t("configurePayment")} <FaChevronRight />
                  </a>
                </li>
              )}
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
          {headerLinks.length > 0 && (
            <div className="max-md:hidden flex-[1_1_0] min-w-0 flex items-center gap-2">
              <ScrollMoreButton
                scrollElementId={linksScrollId}
                position="left"
                ariaLabel={t("scrollLinksLeft")}
              />
              <div className="relative flex-1 min-w-0">
                <div id={linksScrollId} className={navbarLinkStripStyles}>
                  {renderArtistLinkButtons(headerLinks)}
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
            </div>
          )}
        </div>
      </nav>

      <ArtistSection>
        <Outlet context={{ openTipModal, defaultSectionId }} />
      </ArtistSection>
      {isTipOnly && (
        <TipArtistModal
          artist={artist}
          open={isTipModalOpen}
          onClose={closeTipModal}
        />
      )}
    </>
  );
}

export default Index;
