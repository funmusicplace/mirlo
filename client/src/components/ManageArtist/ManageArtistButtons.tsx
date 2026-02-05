import { css } from "@emotion/css";
import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEdit, FaEye, FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedTrackGroup, queryTrackGroup } from "queries";
import { useAuthContext } from "state/AuthContext";
import FixedButtonLink from "components/common/FixedButton";
import { IoIosColorPalette } from "react-icons/io";
import { useGlobalStateContext } from "state/GlobalState";
import Wishlist from "components/TrackGroup/Wishlist";
import TipArtist from "components/common/TipArtist";
import useCurrentTrackHook from "components/Player/useCurrentTrackHook";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import { RiAdminLine } from "react-icons/ri";

const PlayingTrack: React.FC = () => {
  const { state } = useGlobalStateContext();
  const { currentTrack, isLoading } = useCurrentTrackHook();

  if (!state.playing) {
    return null;
  }

  if (!currentTrack || isLoading) {
    return null;
  }

  return (
    <div
      className={css`
        margin-top: 0.5rem;
        display: flex;
        gap: 0.5rem;
      `}
    >
      <Wishlist trackGroup={{ id: currentTrack.trackGroupId }} fixed />
      {/* {state.playing && ( */}
      {currentTrack.trackGroup.artistId && (
        <TipArtist artistId={currentTrack.trackGroup.artistId} fixed />
      )}

      {currentTrack.trackGroup && (
        <PurchaseOrDownloadAlbum trackGroup={currentTrack.trackGroup} fixed />
      )}
    </div>
  );
};

const ManageArtistButtons: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { pathname } = useLocation();
  const { artistId, trackGroupId } = useParams();
  const isManagePage =
    pathname.includes("/manage/artists") && !pathname.includes("/customize");
  const seeViewLink = pathname.includes("/manage/artists");
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: trackGroup } = useQuery(
    queryTrackGroup({
      albumSlug: trackGroupId ?? "",
      artistId,
    })
  );
  const { data: managedTrackGroup } = useQuery(
    queryManagedTrackGroup(Number(trackGroupId) ?? 0)
  );
  const { user } = useAuthContext();

  const canLabelEditArtist = artist?.artistLabels?.some(
    (label) => label.labelUserId === user?.id && label.canLabelAddReleases
  );

  const canEditArtist =
    artist &&
    (user?.id === artist?.userId || user?.isAdmin || canLabelEditArtist);

  const isAlbumPage = Boolean(trackGroupId);

  const beforeReleaseDate =
    managedTrackGroup?.releaseDate &&
    new Date(managedTrackGroup?.releaseDate) > new Date();

  return (
    <>
      {artist && (
        <div
          className={css`
            z-index: 999999;
            bottom: 90px;
            left: 1rem;
            position: fixed;
            display: flex;
            flex-direction: column;

            a,
            button {
              margin-bottom: 0.5rem;
            }
            transition: all 0.3s ease;

            @media screen and (max-width: ${bp.medium}px) {
              .children {
                display: none;
              }

              .endIcon {
                margin: 0 !important;
              }
            }
          `}
        >
          {user?.isAdmin && (
            <>
              <FixedButtonLink
                to={`/admin/users/${artist.userId}`}
                endIcon={<RiAdminLine />}
                size="compact"
                rounded
                variant="dashed"
              >
                {t("adminEditUser")}
              </FixedButtonLink>
              <FixedButtonLink
                to={`/admin/artists/${artist.id}`}
                endIcon={<RiAdminLine />}
                size="compact"
                rounded
                variant="dashed"
              >
                {t("adminEditArtist")}
              </FixedButtonLink>
              {isAlbumPage && trackGroup && (
                <FixedButtonLink
                  to={`/admin/trackGroups/${trackGroup.id}`}
                  endIcon={<RiAdminLine />}
                  size="compact"
                  rounded
                  variant="dashed"
                >
                  {t("adminEditRelease")}
                </FixedButtonLink>
              )}
            </>
          )}
          {canEditArtist && (
            <>
              {!isAlbumPage && (
                <FixedButtonLink
                  to={`/manage/artists/${artist.id}/customize`}
                  endIcon={<IoIosColorPalette />}
                  size="compact"
                  rounded
                  variant="dashed"
                >
                  {t(
                    artist.isLabelProfile
                      ? "customizeLabelLook"
                      : "customizeLook"
                  )}
                </FixedButtonLink>
              )}
              {!isManagePage && !isAlbumPage && (
                <FixedButtonLink
                  to={`/manage/artists/${artist.id}`}
                  endIcon={<FaPen />}
                  size="compact"
                  variant="dashed"
                  rounded
                >
                  {t(artist.isLabelProfile ? "editLabelPage" : "editPage")}
                </FixedButtonLink>
              )}
              {seeViewLink && !isAlbumPage && (
                <FixedButtonLink
                  to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}
                  endIcon={<FaEye />}
                  disabled={!artist}
                  variant="dashed"
                  size="compact"
                  rounded
                >
                  {t("viewLive")}
                </FixedButtonLink>
              )}
              {trackGroup && isAlbumPage && (
                <FixedButtonLink
                  to={getManageReleaseUrl(artist, trackGroup)}
                  endIcon={<FaEdit />}
                  disabled={!artist}
                  variant="dashed"
                  size="compact"
                  rounded
                >
                  {t("editRelease")}
                </FixedButtonLink>
              )}
              {managedTrackGroup && (
                <FixedButtonLink
                  to={getReleaseUrl(artist, managedTrackGroup)}
                  endIcon={<FaEye />}
                  disabled={!artist}
                  variant="dashed"
                  size="compact"
                  rounded
                >
                  {t(beforeReleaseDate ? "viewPreorder" : "viewLive")}
                </FixedButtonLink>
              )}
            </>
          )}
        </div>
      )}
      <div
        className={css`
          z-index: 999999;
          bottom: 80px;
          right: 1rem;
          position: fixed;
          display: flex;
          flex-direction: column;
          a,
          button {
            margin-bottom: 0.5rem;
          }
          transition: all 0.3s ease;
        `}
      >
        <PlayingTrack />
      </div>
    </>
  );
};

export default ManageArtistButtons;
