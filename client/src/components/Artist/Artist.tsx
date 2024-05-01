import { bp } from "../../constants";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArtistTabs } from "components/common/Tabs";
import React from "react";
import api from "services/api";
import { FaChevronRight } from "react-icons/fa";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";

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
  const {
    state: { artist, isLoading, userStripeStatus },
  } = useArtistContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReceivePayments = userStripeStatus?.chargesEnabled;

  React.useEffect(() => {
    const subPages = ["posts", "releases", "support"];
    const end = pathname.split("/")[2];

    if (!subPages.includes(end)) {
      const navigateTo =
        (artist?.trackGroups.length ?? 0) > 0
          ? "releases"
          : (artist?.posts.length ?? 0) > 0
            ? "posts"
            : canReceivePayments
              ? "support"
              : undefined;
      if (navigateTo) {
        navigate(navigateTo, { replace: true });
      }
    }
  }, [
    pathname,
    navigate,
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
      <ArtistTabs>
        {(artist?.trackGroups.length ?? 0) > 0 && (
          <li>
            <NavLink to="releases" id="artist-navlink-releases">
              {t("releases")}
            </NavLink>
          </li>
        )}
        {(artist?.posts.length ?? 0) > 0 && (
          <li>
            <NavLink to="posts">{t("updates")}</NavLink>
          </li>
        )}
        {canReceivePayments &&
          (artist?.subscriptionTiers.filter((tier) => !tier.isDefaultTier)
            .length ?? 0) > 0 && (
            <li>
              <NavLink to="support">
                {t("support", { artist: artist.name })}
              </NavLink>
            </li>
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
