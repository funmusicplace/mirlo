import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import ClickToPlay from "components/common/ClickToPlay";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";

const TrackGroupCard: React.FC<{
  album: TrackGroup;
  setManageTrackgroup: (tg: TrackGroup) => void;
}> = ({ album, setManageTrackgroup }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  return (
    <Box
      key={album.id}
      className={css`
        display: flex;
        width: 100%;
        margin-bottom: 0.25rem;

        &:not(:first-child) {
          margin-top: 1rem;
        }
      `}
    >
      <ClickToPlay
        trackGroupId={album.id}
        title={album.title}
        image={{
          url: album.cover?.sizes?.[120] ?? "",
          width: 120,
          height: 120,
        }}
        className={css`
          margin-right: 1rem;
        `}
      />

      <div
        className={css`
          display: flex;
          flex-direction: column;
          width: 100%;

          > div {
            display: flex;
            justify-content: space-between;
          }
        `}
      >
        <div>
          <strong>Title: </strong>
          {album.title}
        </div>
        <div>Published: {album.published ? <FaCheck /> : <FaTimes />}</div>
        <div>
          <strong>Tracks:</strong> {album.tracks.length}
        </div>
        <div>
          <strong>Release date: </strong>
          {album.releaseDate?.split("T")[0]}
        </div>

        <div
          className={css`
            display: block;
            width: 100%;
            justify-content: flex-end !important;
            text-align: right;
            margin-top: 0.5rem;
          `}
        >
          <Button
            compact
            onClick={() => {
              setManageTrackgroup(album);
            }}
            style={{ marginRight: "1rem" }}
          >
            {t("manageAlbum")}
          </Button>
          {album.published && (
            <Link
              to={`/${
                album.artist?.urlSlug?.toLowerCase() ?? album.artistId
              }/release/${album.urlSlug}`}
            >
              <Button compact>{t("viewLive")}</Button>
            </Link>
          )}
        </div>
      </div>
    </Box>
  );
};

export default TrackGroupCard;
