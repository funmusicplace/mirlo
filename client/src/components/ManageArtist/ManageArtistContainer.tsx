import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { useTransparentContainer } from "components/ArtistColorsProvider";
import { ArtistBox } from "components/common/Box";
import { queryManagedArtist, queryUserStripeStatus } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { getArtistUrl } from "utils/artist";

import { bp, pageScaleCascade } from "../../constants";
import ArtistHeaderSection from "../common/ArtistHeaderSection";

import ManageArtistAnnouncement from "./ManageArtistDetails/ManageArtistAnnouncement";

const Container = styled.div<{ hasBackground: boolean }>`
  width: 100%;
  padding: var(--mi-side-paddings-normal);
  ${(props) =>
    !props.hasBackground ? "margin-top: 0px;" : "margin-top: calc(8vh);"}
  margin-top: calc(8vh - 39px);
  max-width: var(--artist-content-width, var(--mi-container-big));

  @media screen and (max-width: ${bp.large}px) {
    padding: var(--mi-side-paddings-xsmall);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding: 0rem !important;
    width: 100%;
    ${(props) => (props.hasBackground ? "margin-top: 0px;" : "")}
    ${(props) => (!props.hasBackground ? "margin-top: 0px;" : "")}
  }
`;

export const ArtistPageWrapper: React.FC<{
  children: React.ReactNode;
  hasBackground?: boolean;
}> = ({ children, hasBackground }) => {
  const transparent = useTransparentContainer();
  return (
    <Container hasBackground={!!hasBackground}>
      <div
        className={css`
          ${hasBackground && !transparent
            ? "filter: drop-shadow(0 0 0.5rem rgba(50, 50, 50, 0.3));"
            : ""}
          background-color: ${transparent
            ? "transparent"
            : "var(--mi-background-color)"};
          padding: 0 2rem 2rem;
          height: 100%;

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem !important;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
        `}
      >
        {children}
      </div>
    </Container>
  );
};

const ManageArtistContainer: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { artistId } = useParams();
  const { user } = useAuthContext();
  const transparent = useTransparentContainer();

  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryManagedArtist(Number(artistId))
  );

  const hasLabel = artist?.artistLabels?.find((al) => al.labelUser.id);

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const { data: labelStripeAccountStatus } = useQuery(
    queryUserStripeStatus(hasLabel?.labelUser.id ?? 0)
  );

  const location = useLocation();

  const artistBackground = artist?.background?.sizes;

  if (!artist) {
    return null;
  }

  if (user?.id !== artist?.userId) {
    <Navigate to="/manage" />;
  }

  const isLinksPage = location.pathname.endsWith("/links");

  const dontShowHeader =
    location.pathname.includes("/release/") ||
    (location.pathname.includes("/tiers/") &&
      !location.pathname.includes("supporters")) ||
    location.pathname.includes("/merch/") ||
    location.pathname.includes("/post/") ||
    isLinksPage;

  const isDeepEditPage = dontShowHeader && !isLinksPage;

  const labelProfile = hasLabel?.labelUser.artists?.find(
    (a) => a.isLabelProfile
  );

  const hasTopWarning = !!(
    (user && artist.userId !== user.id) ||
    (user && stripeAccountStatus && !stripeAccountStatus?.chargesEnabled)
  );

  return (
    <div
      className={css`
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;

        @media (min-width: 769px) {
          --artist-content-width: clamp(
            924px,
            calc(3 * (100dvh - 340px) + 9rem),
            var(--mi-container-big)
          );
        }
        ${pageScaleCascade}
      `}
    >
      <ManageArtistAnnouncement showButtons />
      <ArtistPageWrapper hasBackground={!!artistBackground}>
        <div>
          {hasTopWarning && (
            <div className="pt-4 max-md:px-2 max-md:text-sm">
              {user && artist.userId !== user.id && user.isAdmin && (
                <ArtistBox variant="warning">
                  You are viewing this artist as an admin
                </ArtistBox>
              )}

              {user && artist.userId !== user.id && !user.isAdmin && (
                <ArtistBox variant="warning">
                  You are viewing this user as their label
                </ArtistBox>
              )}
              {user &&
                stripeAccountStatus &&
                !stripeAccountStatus?.chargesEnabled && (
                  <ArtistBox variant="warning">
                    <p>
                      <Trans
                        t={t}
                        i18nKey={"paymentProcessorNotSetUp"}
                        components={{
                          manage: (
                            <a
                              href={api.paymentProcessor.stripeConnect(user.id)}
                            ></a>
                          ),
                        }}
                      />
                    </p>
                    {labelStripeAccountStatus && labelProfile && (
                      <p>
                        <Trans
                          t={t}
                          i18nKey={"linkedToLabel"}
                          components={{
                            label: (
                              <Link to={getArtistUrl(labelProfile)}></Link>
                            ),
                          }}
                          values={{
                            label: labelProfile?.name || "the label",
                          }}
                        />
                      </p>
                    )}
                  </ArtistBox>
                )}
            </div>
          )}

          {!dontShowHeader && (
            <ArtistHeaderSection
              artist={artist}
              isLoading={isArtistLoading}
              isManage={true}
            />
          )}

          {!artist.enabled && (
            <ArtistBox variant="warning">{t("notEnabled")}</ArtistBox>
          )}
          {/* Negative padding to keep a consistent look despite the initial padding happening at container level */}
          <div
            className={
              transparent && isDeepEditPage
                ? "bg-(--mi-background-color) -mx-8 -mb-8 px-8 pb-8 max-md:m-0 max-md:p-0"
                : ""
            }
          >
            <Outlet />
          </div>
        </div>
      </ArtistPageWrapper>
    </div>
  );
};

export default ManageArtistContainer;
