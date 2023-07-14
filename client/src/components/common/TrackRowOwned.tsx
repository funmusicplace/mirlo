import { css } from "@emotion/css";
import React from "react";
import { FaPause, FaPen, FaPlay, FaSave, FaTrash } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import useDraggableTrack from "utils/useDraggableTrack";

import IconButton from "./IconButton";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { InputEl } from "./Input";

const TrackRowOwned: React.FC<{
  track: Track;
  owned?: boolean;
  addTracksToQueue: (id: number) => void;
  reload: () => Promise<void>;
  handleDrop: (val: React.DragEvent<HTMLTableRowElement>) => void;
}> = ({ track, addTracksToQueue, reload, handleDrop, owned }) => {
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

  const userId = user?.id;

  const onDeleteClick = React.useCallback(async () => {
    try {
      await api.delete(`users/${userId}/tracks/${track.id}`);
      await reload?.();
      snackbar("Deleted track", { type: "success" });
    } catch (e) {
      console.error(e);
    }
  }, [track.id, userId, reload, snackbar]);

  const updateTrackTitle = React.useCallback(async () => {
    try {
      await api.put<{ title: string }, unknown>(
        `users/${userId}/tracks/${track.id}`,
        {
          title: trackTitle,
        }
      );
    } catch (e) {
    } finally {
      setIsEditingTitle(false);
    }
  }, [track.id, trackTitle, userId]);

  return (
    <tr
      key={track.id}
      id={`${track.id}`}
      onDragOver={(ev) => ev.preventDefault()}
      draggable={true}
      onDragStart={onDragStart}
      onDrop={handleDrop}
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
        {!isEditingTitle && trackTitle}
        {isEditingTitle && (
          <InputEl
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
          />
        )}
      </td>
      <td align="right">
        {isEditingTitle && (
          <IconButton onClick={updateTrackTitle} title="Delete">
            <FaSave />
          </IconButton>
        )}
        {owned && !isEditingTitle && (
          <>
            <IconButton
              compact
              onClick={() => setIsEditingTitle(true)}
              title="Delete"
            >
              <FaPen />
            </IconButton>
            <IconButton compact onClick={onDeleteClick} title="Delete">
              <FaTrash />
            </IconButton>
          </>
        )}
      </td>
    </tr>
  );
};
export default TrackRowOwned;
