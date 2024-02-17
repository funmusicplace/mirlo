import { VscPlay } from "react-icons/vsc";
import { TfiControlPause } from "react-icons/tfi";
import { useGlobalStateContext } from "state/GlobalState";
import React from "react";
import Button from "./Button";

const TrackRowPlayControl: React.FC<{
  trackNumber: number;
  trackId: number;
  onTrackPlayCallback?: (trackId: number) => void;
  canPlayTrack: boolean;
  isDisabled?: boolean;
}> = ({
  trackId,
  trackNumber,
  onTrackPlayCallback,
  canPlayTrack,
  isDisabled,
}) => {
  const {
    state: { playerQueueIds, playing, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;

  const onTrackPlay = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      onTrackPlayCallback?.(trackId);
      dispatch({ type: "setPlaying", playing: true });
    },
    [dispatch, onTrackPlayCallback, trackId]
  );

  const onTrackPause = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      dispatch({ type: "setPlaying", playing: false });
    },
    [dispatch]
  );

  return (
    <>
      {(!playing || currentPlayingTrackId !== trackId) && (
        <>
          <span
            className="track-number"
            style={{
              width: "1.5rem",
              textAlign: "center",
              margin: "0rem .5rem 0rem 0rem",
            }}
          >
            {trackNumber}
          </span>
          {canPlayTrack && !isDisabled && (
            <Button
              compact
              startIcon={<VscPlay />}
              className="play-button"
              onClick={onTrackPlay}
            ></Button>
          )}
        </>
      )}
      {playing && currentPlayingTrackId === trackId && (
        <Button
          compact
          startIcon={<TfiControlPause />}
          data-cy="track-row-pause-button"
          onClick={onTrackPause}
          style={{ width: "2rem", textAlign: "center" }}
        />
      )}
    </>
  );
};

export default TrackRowPlayControl;
