import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";

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
    <>
      {!isPostOrRelease && (
        <>
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
    </>
  );
};

export default ArtistContainer;
