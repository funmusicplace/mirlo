import React from "react";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import { usePlayerSyncRequest } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

const baseButtonClass =
  "flex items-center justify-center bg-transparent hover:bg-transparent text-current cursor-pointer transition-opacity";

const TrackRowPlayControl: React.FC<{
  trackNumber: number;
  trackId: number;
  onTrackPlayCallback?: (trackId: number) => void;
  canPlayTrack: boolean;
  isDisabled?: boolean;
  inWidget?: boolean;
}> = ({
  trackId,
  trackNumber,
  onTrackPlayCallback,
  canPlayTrack,
  isDisabled,
  inWidget,
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
  const isThisTrackPlaying = playing && currentPlayingTrackId === trackId;

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

  const stackClass = inWidget
    ? "relative w-6 h-6 max-sm:w-5 max-sm:h-5"
    : "relative w-8 h-8 max-sm:w-7 max-sm:h-7";

  const numberClass = inWidget
    ? "absolute inset-0 flex items-center justify-start text-[0.7rem] max-sm:text-[0.6rem]"
    : "absolute inset-0 flex items-center justify-center";

  const iconClass = inWidget ? "text-[0.7rem] max-sm:text-[0.6rem]" : "text-sm";

  if (isThisTrackPlaying) {
    return (
      <button
        type="button"
        aria-label="Pause track"
        onClick={onTrackPause}
        className={`${baseButtonClass} ${stackClass} ${
          inWidget ? "justify-start" : ""
        }`}
      >
        <TfiControlPause className={iconClass} aria-hidden />
      </button>
    );
  }

  return (
    <div className={stackClass}>
      <span
        className={`${numberClass} transition-opacity group-hover:opacity-0 group-focus-within:opacity-0`}
        aria-hidden
      >
        {trackNumber}
      </span>
      {canPlayTrack && !isDisabled && (
        <button
          type="button"
          aria-label="Play track"
          onClick={onTrackPlay}
          className={`${baseButtonClass} absolute inset-0 ${
            inWidget ? "justify-start" : ""
          } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100`}
        >
          <VscPlay className={iconClass} aria-hidden />
        </button>
      )}
    </div>
  );
};

export default TrackRowPlayControl;
