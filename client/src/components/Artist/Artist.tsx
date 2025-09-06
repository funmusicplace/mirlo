import { bp } from "../../constants";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import styled from "@emotion/styled";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArtistTabs } from "components/common/Tabs";
import React from "react";
import api from "services/api";
import { FaChevronRight, FaEdit } from "react-icons/fa";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  queryArtist,
  queryPublicLabelTrackGroups,
  queryUserStripeStatus,
} from "queries";
import { getArtistManageUrl } from "utils/artist";
import { ArtistButtonLink } from "./ArtistButtons";
import useManagedArtistQuery from "utils/useManagedArtistQuery";
import useArtistQuery from "utils/useArtistQuery";

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
  to: string;
  icon: React.ReactElement;
}> = ({ to, icon }) => {
  const { user } = useAuthContext();
  const { data: viewingArtist } = useArtistQuery();
  const { data: managedArtist } = useManagedArtistQuery();

  const artist = viewingArtist ?? managedArtist;
  const isArtistUser = artist?.userId === user?.id;

  const canEdit = isArtistUser || user?.isAdmin;
  if (!canEdit) return null;

  return (
    <ArtistButtonLink
      startIcon={icon}
      to={to}
      variant="dashed"
      className={
        "edit " +
        css`
          margin-left: 0.5rem;
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

  const { data: artist, isLoading } = useQuery(
    queryArtist({ artistSlug: artistId })
  );

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );
  const { data: releases } = useQuery(queryPublicLabelTrackGroups(artistId));

  console.log("artist", artist);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReceivePayments = stripeAccountStatus?.chargesEnabled;

  const urlSlug = artist?.urlSlug;

  React.useEffect(() => {
    const subPages = [
      "posts",
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

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const isArtistUser = artist.userId === user?.id;

  return (
    <>
      <ArtistTabs color={artist.properties?.colors.primary}>
        {artist.isLabelProfile && (
          <li>
            <NavLink to="roster">
              {artist.properties?.titles?.roster || t("roster")}
            </NavLink>
            <ArtistButtonQuickLink to="profile/label" icon={<FaEdit />} />
          </li>
        )}
        {((artist?.trackGroups.length ?? 0) > 0 ||
          (releases?.results.length ?? 0) > 0) && (
          <li>
            <NavLink to="releases" id="artist-navlink-releases">
              {artist.properties?.titles?.releases || t("releases")}
            </NavLink>
            <ArtistButtonQuickLink
              to={getArtistManageUrl(artist.id) + "/releases"}
              icon={<FaEdit />}
            />
          </li>
        )}
        {(artist?.posts.length ?? 0) > 0 && (
          <li>
            <NavLink to="posts" id="artist-navlink-updates">
              {artist.properties?.titles?.posts || t("updates")}
            </NavLink>
            <ArtistButtonQuickLink
              to={getArtistManageUrl(artist.id) + "/posts"}
              icon={<FaEdit />}
            />
          </li>
        )}
        {canReceivePayments && (
          <>
            {(artist?.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
              .length ?? 0) > 0 && (
              <li>
                <NavLink to="support">
                  {artist.properties?.titles?.support ||
                    t("support", { artist: artist.name })}
                </NavLink>
                <ArtistButtonQuickLink
                  to={getArtistManageUrl(artist.id) + "/tiers"}
                  icon={<FaEdit />}
                />
              </li>
            )}
          </>
        )}
        {(artist.merch.length ?? 0) > 0 && (
          <>
            <li
              className={css`
                display: flex;
              `}
            >
              <NavLink to="merch">
                {artist.properties?.titles?.merch || t("merch")}
              </NavLink>
              <ArtistButtonQuickLink
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

      <ArtistSection>
        <Outlet />
      </ArtistSection>
    </>
  );
}

export default Artist;
