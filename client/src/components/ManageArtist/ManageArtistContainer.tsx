import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import { Outlet } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import styled from "@emotion/styled";

export const ArtistPageWrapper = styled.div<{ artistBanner: boolean }>`
  filter: drop-shadow(0 0 0.5rem rgba(50, 50, 50, 0.3));
  width: 100%;
  padding: 0 2rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0rem 0.5rem 0rem;
  }

  margin-top: calc(16vh);
  ${(props) => (!props.artistBanner ? "margin-top: 0px;" : "")}
  background: var(--mi-light-background-color);
  max-width: calc(1080px + 4rem);

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0rem !important;
    width: 100%;
    margin-top: 0px;
    margin-top: 0px;
  }
`;

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
      <ArtistHeaderSection artist={artist} />

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
    </ArtistPageWrapper>
  );
};

export default ManageArtist;
