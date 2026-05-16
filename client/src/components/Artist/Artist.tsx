import { useQuery } from "@tanstack/react-query";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { ArtistTabs } from "components/common/Tabs";
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
import { TabConfig, TabId, sortTabsByOrder } from "utils/artistTabs";

import Box from "../common/Box";

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

function Artist() {
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

  const urlSlug = artist?.urlSlug;

  React.useEffect(() => {
    const subPages = [
      "posts",
      "tip",
      "releases",
      "support",
      "links",
      "merch",
      "roster",
      "checkout-complete",
    ];
    const end = pathname.split("/")[2];

    if (!subPages.includes(end) && artist && urlSlug) {
      const tabVisible: Record<TabId, boolean> = {
        roster:
          artist.isLabelProfile && (artist.user?.artistLabels?.length ?? 0) > 0,
        releases:
          (artist.trackGroups.length ?? 0) > 0 ||
          (releases?.results.length ?? 0) > 0,
        posts: (artist.posts.length ?? 0) > 0,
        support:
          !!canReceivePayments &&
          (artist.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
            .length ?? 0) > 0,
        merch: (artist.merch.length ?? 0) > 0,
      };

      const defaultOrder: TabId[] = [
        "roster",
        "releases",
        "posts",
        "support",
        "merch",
      ];

      const ordered = sortTabsByOrder(
        defaultOrder.map((id) => ({
          id,
          visible: tabVisible[id],
          label: "",
          to: id,
        })),
        artist.properties?.tabOrder as TabId[] | undefined
      );

      const firstVisible = ordered.find((tab) => tab.visible);
      if (firstVisible) {
        navigate(`/${urlSlug}/${firstVisible.to}`, { replace: true });
      } else if (artist.linksJson?.length) {
        navigate(`/${urlSlug}/links`, { replace: true });
      }
    }
  }, [
    pathname,
    navigate,
    urlSlug,
    artist,
    releases?.results.length,
    canReceivePayments,
  ]);

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
      visible:
        !!canReceivePayments &&
        (artist?.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
          .length ?? 0) > 0,
      to: "support",
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

  return (
    <>
      <nav
        className="max-md:-mt-2"
        aria-label={
          artist.isLabelProfile ? t("labelNavigation") : t("artistNavigation")
        }
      >
        <ArtistTabs>
          {tabs
            .filter((tab) => tab.visible)
            .map((tab) => (
              <li key={tab.id}>
                <NavLink to={tab.to} id={tab.navLinkId}>
                  {tab.label}
                </NavLink>
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
      </nav>

      <ArtistSection>
        <Outlet />
      </ArtistSection>
    </>
  );
}

export default Artist;
