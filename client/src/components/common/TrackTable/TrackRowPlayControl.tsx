import { css } from "@emotion/css";
import React from "react";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import { usePlayerSyncRequest } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import Button from "../Button";

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
  const embeddedInMirlo = isEmbeddedInMirlo();
  const sendPlayerRequest = usePlayerSyncRequest();
  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;

  const onTrackPlay = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      if (embeddedInMirlo) {
        sendPlayerRequest({ type: "play", trackId });
      } else {
        onTrackPlayCallback?.(trackId);
        dispatch({ type: "setPlaying", playing: true });
      }
    },
    [dispatch, onTrackPlayCallback, trackId, embeddedInMirlo, sendPlayerRequest]
  );

  const onTrackPause = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      if (embeddedInMirlo) {
        sendPlayerRequest({ type: "pause", trackId });
      } else {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch, trackId, embeddedInMirlo, sendPlayerRequest]
  );

  return (
    <>
      {(!playing || currentPlayingTrackId !== trackId) && (
        <>
          <span
            className={
              "track-number " +
              css`
                text-align: center;
                margin: 0 0 0 0;
              `
            }
          >
            {trackNumber}
          </span>
          {canPlayTrack && !isDisabled && (
            <Button
              aria-label="Play track"
              size="compact"
              startIcon={<VscPlay />}
              className="play-button"
              onClick={onTrackPlay}
            ></Button>
          )}
        </>
      )}
      {playing && currentPlayingTrackId === trackId && (
        <Button
          aria-label="Pause track"
          size="compact"
          startIcon={<TfiControlPause />}
          className="pause-button"
          onClick={onTrackPause}
          style={{ width: "2rem", textAlign: "center" }}
        />
      )}
    </>
  );
};

export default TrackRowPlayControl;
