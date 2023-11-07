import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import ClickToPlay from "components/common/ClickToPlay";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";

const TrackGroupCard: React.FC<{
  album: TrackGroup;
  reload: () => Promise<void>;
}> = ({ album, reload }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { t: trackGroupCardTranslation } = useTranslation("translation", {
    keyPrefix: "trackGroupCard",
  });

  const userId = user?.id;
  const releaseDate = new Date(album.releaseDate);
  const currentDate = new Date();

  const deleteTrackGroup = React.useCallback(async () => {
    try {
      const confirmed = window.confirm(t("deleteTrackGroupConfirm") ?? "");
      if (confirmed) {
        await api.delete(`users/${userId}/trackGroups/${album.id}`);
        snackbar(t("albumDeleted"), { type: "success" });
      }
    } catch (e) {
      console.error(e);
      snackbar(t("somethingWentWrong"), { type: "warning" });
    } finally {
      reload?.();
    }
  }, [t, userId, album.id, snackbar, reload]);

  return (
    <Box
      key={album.id}
      className={css`
        display: flex;
        width: 100%;
        margin-bottom: 0.25rem;
        padding: 1rem 1rem 1rem;

        &:not(:first-child) {
          margin-top: 1rem;
        }
        @media screen and (max-width: ${bp.medium}px) {
          font-size: 0.8rem;
        }
      `}
    >
      <div>
        <ClickToPlay
          trackGroupId={album.id}
          title={album.title}
          image={{
            url: album.cover?.sizes?.[300] ?? "",
            width: 150,
            height: 150,
          }}
          className={css`
            margin-right: 1rem;
          `}
        />
      </div>

      <div
        className={css`
          display: flex;
          flex-direction: column;
          width: 100%;

          > div {
            display: flex;
            justify-content: space-between;
          }

          @media screen and (max-width: ${bp.medium}px) {
            font-size: 0.8rem;
            > div {
              justify-content: flex-start;
              flex-wrap: wrap;

              &:not(:first-child) {
                margin-top: 0.5rem;
              }
            }
          }
        `}
      >
        <div>
          <strong>{trackGroupCardTranslation("title")} </strong>
          {album.title}
        </div>
        <div>
          {trackGroupCardTranslation("published")}{" "}
          {album.published ? <FaCheck /> : <FaTimes />}
        </div>
        <div>
          <strong>{trackGroupCardTranslation("tracks")}</strong>{" "}
          {album.tracks.length}
        </div>
        <div>
          <strong>{trackGroupCardTranslation("releaseDate")} </strong>
          {album.releaseDate?.split("T")[0]}
        </div>

        <div
          className={css`
            display: block;
            width: 100%;
            justify-content: flex-end !important;
            text-align: right;
            margin-top: 0.5rem;

            & > * {
              margin-right: 1rem;
            }

            & > :last-child {
              margin-right: 0;
            }

            @media screen and (max-width: ${bp.medium}px) {
              justify-content: space-between !important;

            button {
              font-size: .7rem;
            }
          `}
        >
          <Link to={`/manage/artists/${album.artistId}/release/${album.id}`}>
            <Button compact>{t("manageAlbum")}</Button>
          </Link>
          {album.published && (
            <Link
              to={`/${
                album.artist?.urlSlug?.toLowerCase() ?? album.artistId
              }/release/${album.urlSlug}`}
            >
              <Button compact>{t("viewLive")}</Button>
            </Link>
          )}
          {!album.published && releaseDate > currentDate && (
            <Button compact startIcon={<FaTrash />} onClick={deleteTrackGroup}>
              {t("delete")}
            </Button>
          )}
        </div>
      </div>
    </Box>
  );
};

export default TrackGroupCard;
