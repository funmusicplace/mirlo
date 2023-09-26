import { css } from "@emotion/css";
import React from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import { useGlobalStateContext } from "state/GlobalState";
import useDraggableTrack from "utils/useDraggableTrack";

import IconButton from "./IconButton";
import { fmtMSS, isTrackOwnedOrPreview } from "utils/tracks";

const TrackRow: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  addTracksToQueue: (id: number) => void;
}> = ({ track, addTracksToQueue, trackGroup }) => {
  const [trackTitle] = React.useState(track.title);
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

  const canPlayTrack = isTrackOwnedOrPreview(track, user, trackGroup);

  return (
    <tr
      key={track.id}
      id={`${track.id}`}
      onDragOver={(ev) => ev.preventDefault()}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={css`
        border-bottom: 1px solid var(--mi-lighter-foreground-color);
        ${!canPlayTrack ? `color: var(--mi-light-foreground-color);` : ""}
        :first-child {
          border-top: 1px solid var(--mi-lighter-foreground-color);
        }

        > td > .play-button {
          opacity: 0;
        }
        &:hover > td > .play-button {
          opacity: 1;
        }
      `}
    >
      {canPlayTrack && (
        <td
          className={css`
            width: 40px;
          `}
        >
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
      )}
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
      <td>{trackGroup.artist.name}</td>
      <td>{track.audio?.duration && fmtMSS(track.audio.duration)}</td>
    </tr>
  );
};
export default TrackRow;
