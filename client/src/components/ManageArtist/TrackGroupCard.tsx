import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { getReleaseUrl } from "utils/artist";

const TrackGroupCard: React.FC<{
  album: TrackGroup;
  artist: Artist;
  reload: () => Promise<void>;
}> = ({ album, artist, reload }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { t: trackGroupCardTranslation } = useTranslation("translation", {
    keyPrefix: "trackGroupCard",
  });

  const userId = user?.id;

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
        padding: 0 !important;
        background-color: var(--mi-darken-background-color);

        &:not(:first-child) {
          margin-top: 1rem;
        }
        @media screen and (max-width: ${bp.medium}px) {
          font-size: 0.8rem;
        }
      `}
    >
      <div
        className={css`
          flex: 20%;
          max-width: 20%;

          @media screen and (max-width: ${bp.medium}px) {
            flex: 45%;
            max-width: 45%;
          }
        `}
      >
        <div
          className={css`
            @media screen and (max-width: ${bp.medium}px) {
              margin-right: 0;
            }
          `}
        >
          <Link to={getReleaseUrl(artist, album)}>
            <ImageWithPlaceholder
              src={album.cover?.sizes?.[600]}
              alt={album.title}
              size={250}
            />
          </Link>
        </div>
      </div>

      <div
        className={css`
          flex: 80%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          padding: 1rem;

          > div {
            display: flex;
            justify-content: flex-start;
          }

          strong {
            margin-right: 1rem;
          }

          @media screen and (max-width: ${bp.medium}px) {
            flex: 55%;
            max-width: 55%;
            font-size: 0.8rem;
            padding: 0.5rem;
            padding-right: 0.5rem;

            strong {
              margin-right: 0.5rem;
            }

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
          <strong>{trackGroupCardTranslation("title")}</strong>
          {album.title}
        </div>
        <div>
          <strong>{trackGroupCardTranslation("published")}</strong>{" "}
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
          {album.artist && album.published && (
            <Link to={getReleaseUrl(album.artist, album)}>
              <Button compact>{t("viewLive")}</Button>
            </Link>
          )}
          {!album.published && (
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
