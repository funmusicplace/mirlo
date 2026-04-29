import { css } from "@emotion/css";
import styled from "@emotion/styled";
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
import { FaChevronRight, FaEdit } from "react-icons/fa";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getArtistManageUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { bp } from "../../constants";
import Box from "../common/Box";

import { ArtistButtonLink } from "./ArtistButtons";

export const ArtistSection = styled.div`
  margin-bottom: 2rem;
  margin-top: 0.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    margin-top: 0.5rem;
    margin-bottom: 1.5rem;
  }
`;

export const ArtistButtonQuickLink: React.FC<{
  ariaLabel: string;
  to: string;
  icon: React.ReactElement;
}> = ({ ariaLabel, to, icon }) => {
  const { user } = useAuthContext();
  const { data: viewingArtist } = useArtistQuery();
  const { data: managedArtist } = useManagedArtistQuery();

  const artist = viewingArtist ?? managedArtist;
  const isArtistUser = artist?.userId === user?.id;

  const canEdit = isArtistUser || user?.isAdmin;
  if (!canEdit) return null;

  return (
    <ArtistButtonLink
      aria-label={ariaLabel}
      startIcon={icon}
      to={to}
      variant="dashed"
      className={
        "edit " +
        css`
          margin-left: 0.25rem;
          margin-top: -0.5rem;
        `
      }
    />
  );
};

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

    if (!subPages.includes(end)) {
      if (artist?.isLabelProfile) {
        navigate(`/${urlSlug}/roster`, { replace: true });
      } else if (artist?.trackGroups.length) {
        // has track groups
        navigate(`/${urlSlug}/releases`, { replace: true });
      } else if (artist?.posts.length) {
        // has track groups
        navigate(`/${urlSlug}/posts`, { replace: true });
      } else if (canReceivePayments) {
        // has track groups
        navigate(`/${urlSlug}/support`, { replace: true });
      } else if (artist?.linksJson?.length) {
        // has links
        navigate(`/${urlSlug}/links`, { replace: true });
      }
    }
  }, [
    pathname,
    navigate,
    user?.id,
    urlSlug,
    artist?.trackGroups.length,
    artist?.posts.length,
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

  return (
    <>
      <nav
        aria-label={
          artist.isLabelProfile ? t("labelNavigation") : t("artistNavigation")
        }
      >
        <ArtistTabs>
          {artist.isLabelProfile && (
            <>
              <li className="tab-primary">
                <NavLink to="roster">{rosterTitle}</NavLink>
              </li>
              <li className="tab-secondary">
                <ArtistButtonQuickLink
                  ariaLabel={t("editTitled", { title: rosterTitle })}
                  to="/profile/label"
                  icon={<FaEdit />}
                />
              </li>
            </>
          )}
          {((artist?.trackGroups.length ?? 0) > 0 ||
            (releases?.results.length ?? 0) > 0) && (
            <>
              <li className="tab-primary">
                <NavLink to="releases" id="artist-navlink-releases">
                  {releasesTitle}
                </NavLink>
              </li>
              <li className="tab-secondary">
                <ArtistButtonQuickLink
                  ariaLabel={t("editTitled", { title: releasesTitle })}
                  to={getArtistManageUrl(artist.id) + "/releases"}
                  icon={<FaEdit />}
                />
              </li>
            </>
          )}
          {(artist?.posts.length ?? 0) > 0 && (
            <>
              <li className="tab-primary">
                <NavLink to="posts" id="artist-navlink-updates">
                  {postsTitle}
                </NavLink>
              </li>
              <li className="tab-secondary">
                <ArtistButtonQuickLink
                  ariaLabel={t("editTitled", { title: postsTitle })}
                  to={getArtistManageUrl(artist.id) + "/posts"}
                  icon={<FaEdit />}
                />
              </li>
            </>
          )}
          {canReceivePayments && (
            <>
              {(artist?.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
                .length ?? 0) > 0 && (
                <>
                  <li className="tab-primary">
                    <NavLink to="support">{supportTitle}</NavLink>
                  </li>
                  <li className="tab-secondary">
                    <ArtistButtonQuickLink
                      ariaLabel={t("editTitled", { title: supportTitle })}
                      to={getArtistManageUrl(artist.id) + "/tiers"}
                      icon={<FaEdit />}
                    />
                  </li>
                </>
              )}
            </>
          )}
          {(artist.merch.length ?? 0) > 0 && (
            <>
              <li className="tab-primary">
                <NavLink to="merch">{merchTitle}</NavLink>
              </li>
              <li className="tab-secondary">
                <ArtistButtonQuickLink
                  ariaLabel={t("editTitled", { title: merchTitle })}
                  to={getArtistManageUrl(artist.id) + "/merch"}
                  icon={<FaEdit />}
                />
              </li>
            </>
          )}
          {user && isArtistUser && !canReceivePayments && (
            <li>
              <a
                href={api.paymentProcessor.stripeConnect(user.id)}
                className={css`
                  display: flex !important;
                  align-items: center;

                  svg {
                    margin-left: 0.25rem;
                  }
                `}
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
