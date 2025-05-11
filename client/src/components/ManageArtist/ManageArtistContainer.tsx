import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { Trans, useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import Box, { ArtistBox } from "components/common/Box";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryUserStripeStatus } from "queries";
import { useAuthContext } from "state/AuthContext";
import api from "services/api";
import LabelConfirmation from "./ManageArtistDetails/LabelConfirmation";

const Container = styled.div<{ artistBanner: boolean }>`
  width: 100%;
  padding: var(--mi-side-paddings-normal);
  ${(props) =>
    !props.artistBanner ? "margin-top: 0px;" : "margin-top: calc(8vh);"}
  margin-top: calc(8vh - 39px);
  max-width: var(--mi-container-big);

  @media screen and (max-width: ${bp.large}px) {
    padding: var(--mi-side-paddings-xsmall);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding: 0rem !important;
    width: 100%;
    ${(props) => (props.artistBanner ? "margin-top: 0px;" : "")}
    ${(props) => (!props.artistBanner ? "margin-top: 0px;" : "")}
  }
`;

export const ArtistPageWrapper: React.FC<{
  children: React.ReactNode;
  artistBanner?: boolean;
}> = ({ children, artistBanner }) => {
  return (
    <Container artistBanner={!!artistBanner}>
      <div
        className={css`
          ${artistBanner
            ? "filter: drop-shadow(0 0 0.5rem rgba(50, 50, 50, 0.3));"
            : ""}
          background: var(--mi-normal-background-color);
          padding: 0 2rem 2rem;
          height: 100%;

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem !important;
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

  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const location = useLocation();

  const artistBanner = artist?.banner?.sizes;

  if (!artist) {
    return null;
  }

  if (user?.id !== artist?.userId) {
    <Navigate to="/manage" />;
  }

  const dontShowHeader =
    location.pathname.includes("/release/") ||
    location.pathname.includes("/new-release") ||
    location.pathname.includes("/post/");

  return (
    <ArtistPageWrapper artistBanner={!!artistBanner}>
      <>
        {user && artist.userId !== user.id && (
          <ArtistBox variant="warning">
            You are viewing this artist as an admin
          </ArtistBox>
        )}
        {user &&
          stripeAccountStatus &&
          !stripeAccountStatus?.chargesEnabled && (
            <ArtistBox variant="warning">
              <Trans
                t={t}
                i18nKey={"paymentProcessorNotSetUp"}
                components={{
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  manage: (
                    <a href={api.paymentProcessor.stripeConnect(user.id)}></a>
                  ),
                }}
              />
            </ArtistBox>
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
        <Outlet />
      </>
    </ArtistPageWrapper>
  );
};

export default ManageArtistContainer;
