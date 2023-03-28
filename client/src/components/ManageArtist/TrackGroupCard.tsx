import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import React from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

const TrackGroupCard: React.FC<{
  album: TrackGroup;
  setManageTrackgroup: (tg: TrackGroup) => void;
}> = ({ album, setManageTrackgroup }) => {
  return (
    <Box
      key={album.id}
      className={css`
        display: flex;
        flex-direction: column;

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
      <div>Enabled: {album.enabled ? <FaCheck /> : <FaTimes />}</div>
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
          text-align: right;
          margin-top: 0.5rem;
        `}
      >
        <Button
          compact
          onClick={() => {
            setManageTrackgroup(album);
          }}
        >
          Manage
        </Button>
      </div>
    </Box>
  );
};

export default TrackGroupCard;
