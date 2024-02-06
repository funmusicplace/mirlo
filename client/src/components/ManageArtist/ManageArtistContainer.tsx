import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useGlobalStateContext } from "state/GlobalState";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { useArtistContext } from "state/ArtistContext";
import Box from "components/common/Box";

const Container = styled.div<{ artistBanner: boolean; userId?: number }>`
  width: 100%;
  padding: var(--mi-side-paddings-normal);
  ${(props) =>
    !props.artistBanner ? "margin-top: 0px;" : "margin-top: calc(8vh);"}
  ${(props) =>
    props.userId ? "margin-top: calc(8vh - 39px);" : "margin-top: calc(1vh);"}
  max-width: var(--mi-container-big);

  @media screen and (max-width: ${bp.large}px) {
    padding: var(--mi-side-paddings-xsmall);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding: 0rem !important;
    width: 100%;
    ${(props) => (props.artistBanner ? "margin-top: 0px;" : "")}
    ${(props) => (!props.userId ? "margin-top: calc(7vh);" : "")}
    ${(props) => (!props.artistBanner ? "margin-top: 0px;" : "")}
  }
`;

export const ArtistPageWrapper: React.FC<{
  children: React.ReactNode;
  artistBanner?: boolean;
}> = ({ children, artistBanner }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;
  return (
    <Container userId={userId} artistBanner={!!artistBanner}>
      <div
        className={css`
          ${artistBanner
            ? "filter: drop-shadow(0 0 0.5rem rgba(50, 50, 50, 0.3));"
            : ""}
          background: var(--mi-normal-background-color);
          padding: 0 2rem 2rem;
          height: 100%;

          a {
            color: var(--mi-normal-foreground-color);
            font-weight: normal;
          }
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

  const {
    state: { artist },
  } = useArtistContext();

  const {
    state: { user },
  } = useGlobalStateContext();

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
          <Box
            className={css`
              background-color: var(--mi-warning-color);
              color: white;
            `}
          >
            You are viewing this artist as an admin
          </Box>
        )}
        {!dontShowHeader && <ArtistHeaderSection artist={artist} isManage />}

        {!artist.enabled && (
          <div
            className={css`
              background-color: var(--mi-warning-background-color);
              padding: 1rem;
              color: var(--mi-warning-text-color);
            `}
          >
            {t("notEnabled")}
          </div>
        )}
        <Outlet />
      </>
    </ArtistPageWrapper>
  );
};

export default ManageArtistContainer;
