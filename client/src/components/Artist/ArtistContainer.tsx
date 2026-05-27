import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import ManageArtistAnnouncement from "components/ManageArtist/ManageArtistDetails/ManageArtistAnnouncement";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";

import { pageScaleCascade } from "../../constants";
import ArtistHeaderSection from "../common/ArtistHeaderSection";

const ArtistContainer: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId, trackGroupId, postId } = useParams();

  const { data: artist, isPending: isArtistLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const artistBackground = artist?.background?.sizes;

  const isPostOrRelease = trackGroupId || postId;

  return (
    <div
      className={css`
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        ${pageScaleCascade}

        @media (min-width: 769px) {
          --artist-content-width: clamp(
            924px,
            calc(3 * (100dvh - 340px) + 9rem),
            var(--mi-container-big)
          );
        }
      `}
    >
      {!isPostOrRelease && (
        <>
          <ManageArtistAnnouncement showButtons={false} />
          <ArtistPageWrapper hasBackground={!!artistBackground}>
            <ArtistHeaderSection
              artist={artist}
              isLoading={isArtistLoading}
              isManage={false}
            />

            {artist && !artist.enabled && (
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
        </>
      )}
      {isPostOrRelease && <Outlet />}
    </div>
  );
};

export default ArtistContainer;
