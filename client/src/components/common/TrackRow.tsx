import { css } from "@emotion/css";
import React from "react";
import { FaPause, FaPen, FaPlay, FaSave, FaTrash } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import useDraggableTrack from "utils/useDraggableTrack";

import IconButton from "./IconButton";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "./Input";

const TrackRow: React.FC<{
  track: Track;
  addTracksToQueue: (id: number) => void;
}> = ({ track, addTracksToQueue }) => {
  const snackbar = useSnackbar();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [trackTitle, setTrackTitle] = React.useState(track.title);
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex, user },
    dispatch,
  } = useGlobalStateContext();
  const { onDragStart, onDragEnd } = useDraggableTrack();

  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;

  const onTrackPlay = React.useCallback(() => {
    addTracksToQueue(track.id);
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch, addTracksToQueue, track.id]);

  const onTrackPause = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: false });
  }, [dispatch]);

  return (
    <tr
      key={track.id}
      id={`${track.id}`}
      onDragOver={(ev) => ev.preventDefault()}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={css`
        > td > .play-button {
          opacity: 0;
        }
        &:hover > td > .play-button {
          opacity: 1;
        }
      `}
    >
      <td>
        {(!playing || currentPlayingTrackId !== track.id) && (
          <IconButton compact className="play-button" onClick={onTrackPlay}>
            <FaPlay />
          </IconButton>
        )}
        {playing && currentPlayingTrackId === track.id && (
          <IconButton
            compact
            data-cy="track-row-pause-button"
            onClick={onTrackPause}
          >
            <FaPause />
          </IconButton>
        )}
      </td>
      <td
        className={css`
          width: 40%;
          overflow: hidden;
          whitespace: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {trackTitle}
      </td>
      <td>{track.trackGroup.artist.name}</td>
    </tr>
  );
};
export default TrackRow;
