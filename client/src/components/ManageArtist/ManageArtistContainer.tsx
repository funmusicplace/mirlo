import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { Outlet } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useGlobalStateContext } from "state/GlobalState";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { useArtistContext } from "state/ArtistContext";

const Container = styled.div<{ artistBanner: boolean; userId?: number }>`
  width: 100%;
  margin-top: calc(12vh);

  ${(props) => (!props.artistBanner ? "margin-top: 0px;" : "")}
  max-width: calc(1080px + 4rem);

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding: 0rem !important;
    width: 100%;
    ${(props) => (props.artistBanner ? "margin-top: 0px;" : "")}
    ${(props) => (!props.userId ? "margin-top: 13vh;" : "")}
    ${(props) => (!props.artistBanner ? "margin-top: 0px;" : "")}
  }
`;

export const ArtistPageWrapper: React.FC<{
  children: React.ReactElement;
  artistBanner: boolean;
}> = ({ children, artistBanner }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;
  return (
    <Container userId={userId} artistBanner={artistBanner}>
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

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const {
    state: { artist },
  } = useArtistContext();

  const artistBanner = artist?.banner?.sizes;

  if (!artist) {
    return null;
  }

  return (
    <ArtistPageWrapper artistBanner={!!artistBanner}>
      <>
        <ArtistHeaderSection artist={artist} isManage />

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

export default ManageArtist;
