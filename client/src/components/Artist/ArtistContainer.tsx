import { css } from "@emotion/css";
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { ButtonLink } from "components/common/Button";
import { FaEye, FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";
import FixedButtonLink from "components/common/FixedButton";

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
      {artist &&
        (user?.isAdmin ||
          (artist && user?.id === artist?.userId && !trackGroupId)) && (
          <div
            className={css`
              z-index: 999999;
              top: 75px;
              right: 1rem;
              position: fixed;
              display: flex;
              flex-direction: column;

              a:first-of-type {
                margin-bottom: 1rem;
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
            <FixedButtonLink
              to={`/manage/artists/${artist.id}/customize`}
              startIcon={<FaEye />}
              size="compact"
              variant="dashed"
            >
              {t("customizeLook")}
            </FixedButtonLink>
            <FixedButtonLink
              to={`/manage/artists/${artist.id}`}
              startIcon={<FaPen />}
              size="compact"
              variant="dashed"
            >
              {t("editPage")}
            </FixedButtonLink>
          </div>
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
