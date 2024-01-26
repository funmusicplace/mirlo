import { css } from "@emotion/css";
import React from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { useArtistContext } from "state/ArtistContext";
import Button from "components/common/Button";
import { FaPen } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import { bp } from "../../constants";

const ArtistContainer: React.FC<{ isManage: boolean }> = (isManage) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { trackGroupId, postId } = useParams();
  const {
    state: { artist },
  } = useArtistContext();
  const {
    state: { user },
  } = useGlobalStateContext();

  const artistBanner = artist?.banner?.sizes;

  if (!artist) {
    return null;
  }

  const isPostOrRelease = trackGroupId || postId;

  return (
    <>
      {isManage && user?.id === artist.userId && !trackGroupId && (
        <Link
          to={`/manage/artists/${artist.id}`}
          className={css`
            z-index: 999999;
            top: 75px;
            right: 1rem;
            color: var(--mi-warning-text-color);
            position: fixed;
            box-shadow: 0.2rem 0.2rem 0.3rem rgba(0, 0, 0, 0.5);

            @media screen and (max-width: ${bp.medium}px) {
              left: 1rem;
              bottom: 75px;
              top: auto;
              right: auto;
            }
          `}
        >
          <Button
            startIcon={<FaPen />}
            compact
            type="button"
            variant="dashed"
            className={css`
              background-color: rgba(255, 255, 255, 0.9) !important;
              color: black !important;
              padding: 1.2rem !important;
              :hover {
                background-color: rgba(0, 0, 0, 0.7) !important;
                color: white !important;
              }
              @media screen and (max-width: ${bp.medium}px) {
                padding: 1rem !important;
              }
            `}
          >
            {t("editPage")}
          </Button>
        </Link>
      )}
      {!isPostOrRelease && (
        <>
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
        </>
      )}
      {isPostOrRelease && <Outlet />}
    </>
  );
};

export default ArtistContainer;
