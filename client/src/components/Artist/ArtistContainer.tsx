import { css } from "@emotion/css";
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import ManageArtistButtons from "components/ManageArtist/ManageArtistButtons";

const ArtistContainer: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId, trackGroupId, postId } = useParams();

  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const artistBanner = artist?.banner?.sizes;

  const isPostOrRelease = trackGroupId || postId;

  return (
    <>
      {!isPostOrRelease && (
        <>
          <ArtistPageWrapper
            artistBanner={!!artistBanner}
            artistBackground={artist?.properties?.colors?.background}
          >
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
    </>
  );
};

export default ArtistContainer;
