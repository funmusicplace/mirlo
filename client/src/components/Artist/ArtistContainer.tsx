import { css } from "@emotion/css";
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { ButtonLink } from "components/common/Button";
import { FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";

const ArtistContainer: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { artistId, trackGroupId, postId } = useParams();

  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { user } = useAuthContext();

  const artistBanner = artist?.banner?.sizes;

  const isPostOrRelease = trackGroupId || postId;

  return (
    <>
      {artist && user?.id === artist?.userId && !trackGroupId && (
        <ButtonLink
          to={`/manage/artists/${artist.id}`}
          startIcon={<FaPen />}
          compact
          variant="dashed"
          className={css`
            z-index: 999999;
            top: 75px;
            right: 1rem;
            position: fixed;
            box-shadow: 0.2rem 0.2rem 0.3rem rgba(0, 0, 0, 0.5);

            background-color: rgba(255, 255, 255, 0.9) !important;
            color: black !important;
            padding: 1.2rem !important;
            :hover {
              background-color: rgba(0, 0, 0, 0.7) !important;
              color: white !important;
            }

            @media screen and (max-width: ${bp.medium}px) {
              left: 1rem;
              bottom: 75px;
              top: auto;
              right: auto;
              padding: 1rem !important;
            }
          `}
        >
          {t("editPage")}
        </ButtonLink>
      )}
      {!isPostOrRelease && (
        <>
          <ArtistPageWrapper artistBanner={!!artistBanner}>
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
