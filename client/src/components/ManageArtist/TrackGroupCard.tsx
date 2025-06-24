import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaEye, FaTimes, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { bp } from "../../constants";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { getManageReleaseUrl, getReleaseUrl } from "utils/artist";
import { useDeleteTrackGroupMutation } from "queries";
import ArtistRouterLink, {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";

const TrackGroupCard: React.FC<{
  album: TrackGroup;
  artist: Artist;
}> = ({ album, artist }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { t: trackGroupCardTranslation } = useTranslation("translation", {
    keyPrefix: "trackGroupCard",
  });

  const { mutateAsync: deleteTrackGroup, isPending: isDeletePending } =
    useDeleteTrackGroupMutation();

  const handleDelete = React.useCallback(async () => {
    const confirmed = window.confirm(t("deleteTrackGroupConfirm") ?? "");
    if (!confirmed) return;

    try {
      await deleteTrackGroup({ userId: artist.userId, trackGroupId: album.id });
      snackbar(t("albumDeleted"), { type: "success" });
    } catch (e) {
      console.error(e);
      snackbar(t("somethingWentWrong"), { type: "warning" });
    }
  }, [artist, album, t]);

  return (
    <Box
      key={album.id}
      className={css`
        display: flex;
        width: auto !important;
        flex-basis: 50%;
        flex-grow: 0;
        padding: 0 2rem 0 0 !important;
        align-items: center;

        @media screen and (max-width: ${bp.medium}px) {
          font-size: var(--mi-font-size-small);
          grid-template-columns: max(40%) max(60%);
        }

        @media screen and (max-width: ${bp.small}px) {
          grid-template-columns: max(35%) max(65%);
        }
      `}
    >
      <div
        className={css`
          align-items: center;
          display: flex;
          a {
            display: flex;
          }
        `}
      >
        <ArtistRouterLink
          to={
            album.published
              ? getReleaseUrl(artist, album)
              : getManageReleaseUrl(artist, album)
          }
          className={css`
            @media screen and (max-width: ${bp.small}px) {
              width: 100%;
            }
          `}
        >
          <ImageWithPlaceholder
            src={album.cover?.sizes?.[300]}
            alt={album.title}
            size={150}
          />
        </ArtistRouterLink>
      </div>

      <div
        className={css`
          display: flex;
          flex-direction: column;
          border-radius: var(--mi-border-radius-focus);
          margin-left: 0.5rem;
          padding: 1rem;
          flex-grow: 1;
          background-color: var(--mi-darken-background-color);

          > div > div {
            display: flex;
            justify-content: flex-start;
          }

          strong {
            margin-right: 1rem;
          }

          @media screen and (max-width: ${bp.medium}px) {
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
        </div>
        <div
          className={css`
            display: flex;
            width: 100%;
            text-align: right;
            margin-top: 0.5rem;
            align-items: center;

            & > * {
              margin-right: 1rem;
            }

            & > :last-child {
              margin-right: 0;
            }

            @media screen and (max-width: ${bp.medium}px) {
              justify-content: space-between !important;
          `}
        >
          <ArtistButtonLink
            to={getManageReleaseUrl(album.artist, album)}
            size="compact"
            variant="outlined"
          >
            {t("manageAlbum")}
          </ArtistButtonLink>
          {album.artist && album.published && (
            <ArtistButtonLink
              to={getReleaseUrl(album.artist, album)}
              size="compact"
              variant="outlined"
              startIcon={<FaEye />}
            >
              {t("viewLive")}
            </ArtistButtonLink>
          )}
          {!album.published && (
            <ArtistButton
              size="compact"
              startIcon={<FaTrash />}
              onClick={handleDelete}
              isLoading={isDeletePending}
            >
              {t("delete")}
            </ArtistButton>
          )}
        </div>
      </div>
    </Box>
  );
};

export default TrackGroupCard;
