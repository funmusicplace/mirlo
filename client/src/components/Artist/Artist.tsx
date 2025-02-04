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
import { queryArtist, queryUserStripeStatus } from "queries";
import { ButtonLink } from "components/common/Button";
import { getArtistManageUrl } from "utils/artist";
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

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReceivePayments = stripeAccountStatus?.chargesEnabled;

  React.useEffect(() => {
    const subPages = ["posts", "releases", "support", "links", "merch"];
    const end = pathname.split("/")[2];

    if (!subPages.includes(end)) {
      if (artist?.trackGroups.length) {
        // has track groups
        navigate("releases", { replace: true });
      } else if (artist?.posts.length) {
        // has track groups
        navigate("posts", { replace: true });
      } else if (canReceivePayments) {
        // has track groups
        navigate("support", { replace: true });
      } else if (artist?.linksJson?.length) {
        // has links
        navigate("links", { replace: true });
      }
    }
  }, [
    pathname,
    navigate,
    user?.id,
    artist?.id,
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
        {(artist?.trackGroups.length ?? 0) > 0 && (
          <li>
            <NavLink to="releases" id="artist-navlink-releases">
              {t("releases")}
            </NavLink>
          </li>
        )}
        {(artist?.posts.length ?? 0) > 0 && (
          <li>
            <NavLink to="posts" id="artist-navlink-updates">
              {t("updates")}
            </NavLink>
          </li>
        )}
        {canReceivePayments && (
          <>
            {(artist?.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
              .length ?? 0) > 0 && (
              <li>
                <NavLink to="support">
                  {t("support", { artist: artist.name })}
                </NavLink>
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
              <NavLink to="merch">{t("merch")}</NavLink>
              {(isArtistUser || user?.isAdmin) && (
                <ArtistButtonLink
                  startIcon={<FaEdit />}
                  to={getArtistManageUrl(artist.id) + "/merch"}
                  variant="dashed"
                  className={
                    "edit " +
                    css`
                      margin-left: 0.5rem;
                      margin-top: -0.5rem;
                    `
                  }
                />
              )}
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
