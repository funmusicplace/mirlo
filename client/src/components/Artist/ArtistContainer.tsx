import { css } from "@emotion/css";
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useTranslation } from "react-i18next";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import { useArtistContext } from "state/ArtistContext";

const ArtistContainer: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { trackGroupId, postId } = useParams();
  const {
    state: { artist },
  } = useArtistContext();

  const artistBanner = artist?.banner?.sizes;

  if (!artist) {
    return null;
  }

  const isPostOrRelease = trackGroupId || postId;

  console.log("isPostOrRelease", isPostOrRelease);

  return (
    <>
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
