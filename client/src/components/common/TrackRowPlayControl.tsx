import { VscPlay } from "react-icons/vsc";
import { TfiControlPause } from "react-icons/tfi";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";
import React from "react";

const TrackRowPlayControl: React.FC<{
  trackNumber: number;
  trackId: number;
  onTrackPlayCallback?: (trackId: number) => void;
  isDisabled?: boolean;
}> = ({ trackId, trackNumber, onTrackPlayCallback, isDisabled }) => {
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
            className={!isDisabled ? "track-number" : ""}
            style={{ width: "2rem", textAlign: "center" }}
          >
            {trackNumber}
          </span>
          {!isDisabled && (
            <IconButton compact className="play-button" onClick={onTrackPlay}>
              <VscPlay />
            </IconButton>
          )}
        </>
      )}
      {playing && currentPlayingTrackId === trackId && (
        <IconButton
          compact
          data-cy="track-row-pause-button"
          onClick={onTrackPause}
          style={{ width: "2rem", textAlign: "center" }}
          >
          <TfiControlPause />
        </IconButton>
      )}
    </>
  );
};

export default TrackRowPlayControl;
