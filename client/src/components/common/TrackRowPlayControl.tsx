import { FaPause, FaPlay } from "react-icons/fa";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";
import React from "react";

const TrackRowPlayControl: React.FC<{
  trackNumber: number;
  trackId: number;
  onTrackPlayCallback?: (trackId: number) => void;
}> = ({ trackId, trackNumber, onTrackPlayCallback }) => {
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;

  const onTrackPlay = React.useCallback(() => {
    onTrackPlayCallback?.(trackId);
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch, onTrackPlayCallback, trackId]);

  const onTrackPause = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: false });
  }, [dispatch]);

  return (
    <>
      {(!playing || currentPlayingTrackId !== trackId) && (
        <>
          <span
            className="track-number"
            style={{ width: "2.2rem", textAlign: "center" }}
          >
            {trackNumber}
          </span>
          <IconButton compact className="play-button" onClick={onTrackPlay}>
            <FaPlay />
          </IconButton>
        </>
      )}
      {playing && currentPlayingTrackId === trackId && (
        <IconButton
          compact
          data-cy="track-row-pause-button"
          onClick={onTrackPause}
        >
          <FaPause />
        </IconButton>
      )}
    </>
  );
};

export default TrackRowPlayControl;
