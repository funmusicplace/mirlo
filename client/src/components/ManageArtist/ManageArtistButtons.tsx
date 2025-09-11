import { css } from "@emotion/css";
import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEye, FaFlag, FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryTrackGroup } from "queries";
import { useAuthContext } from "state/AuthContext";
import FixedButtonLink from "components/common/FixedButton";
import { IoIosColorPalette } from "react-icons/io";
import FlagContent from "components/TrackGroup/FlagContent";

const ManageArtistButtons: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { pathname } = useLocation();
  const [iconOnly, setIconOnly] = React.useState(false);
  const { artistId, trackGroupId } = useParams();
  const isManagePage =
    pathname.includes("/manage/artists") && !pathname.includes("/customize");
  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: trackGroup } = useQuery(
    queryTrackGroup({
      albumSlug: trackGroupId ?? "",
      artistId,
    })
  );
  const { user } = useAuthContext();

  const isCurrentArtist =
    artist && (user?.id === artist?.userId || user?.isAdmin);

  const isAlbumPage = Boolean(trackGroupId);

  return (
    <>
      {artist && (
        <div
          onMouseEnter={() => {
            setIconOnly(false);
          }}
          onMouseLeave={() => {
            setIconOnly(true);
          }}
          className={css`
            z-index: 999999;
            bottom: 75px;
            right: 1rem;
            position: fixed;
            display: flex;
            flex-direction: column;
            a,
            button {
              margin-bottom: 0.5rem;
            }
            transition: all 0.3s ease;

            @media screen and (max-width: ${bp.medium}px) {
              left: 1rem;
              bottom: 75px;
              top: auto;
              right: auto;
            }
          `}
        >
          {isCurrentArtist && !isAlbumPage && (
            <FixedButtonLink
              to={`/manage/artists/${artist.id}/customize`}
              endIcon={<IoIosColorPalette />}
              onlyIcon={iconOnly}
              size="compact"
              rounded
              variant="dashed"
            >
              {t(
                artist.isLabelProfile ? "customizeLabelLook" : "customizeLook"
              )}
            </FixedButtonLink>
          )}
          {isCurrentArtist && !isManagePage && !isAlbumPage && (
            <FixedButtonLink
              to={`/manage/artists/${artist.id}`}
              endIcon={<FaPen />}
              size="compact"
              variant="dashed"
              rounded
              onlyIcon={iconOnly}
            >
              {t(artist.isLabelProfile ? "editLabelPage" : "editPage")}
            </FixedButtonLink>
          )}
          {isCurrentArtist && !isAlbumPage && (
            <FixedButtonLink
              to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}
              endIcon={<FaEye />}
              disabled={!artist}
              variant="dashed"
              size="compact"
              rounded
              onlyIcon={iconOnly}
            >
              {t("viewLive")}
            </FixedButtonLink>
          )}
          {isAlbumPage && trackGroup && (
            <FlagContent trackGroupId={trackGroup.id} onlyIcon={iconOnly} />
          )}
        </div>
      )}
    </>
  );
};

export default ManageArtistButtons;
