import { css } from "@emotion/css";
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { FaEye, FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";
import FixedButtonLink from "components/common/FixedButton";
import Manage from "components/ManageArtist/Manage";
import ManageArtistButtons from "components/ManageArtist/ManageArtistButtons";

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
      <ManageArtistButtons />
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
