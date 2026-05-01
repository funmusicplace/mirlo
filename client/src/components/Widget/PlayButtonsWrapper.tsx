import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import { usePlayerSyncRequest } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";

import { bp } from "../../constants";

export const PlayButtonsWrapper: React.FC<{ ids: number[] }> = ({ ids }) => {
  const {
    state: { playing, playerQueueIds, currentlyPlayingIndex },
    dispatch,
  } = useGlobalStateContext();
  const embeddedInMirlo = isEmbeddedInMirlo();
  const sendPlayerRequest = usePlayerSyncRequest();
  const currentPlayingTrackId =
    currentlyPlayingIndex !== undefined
      ? playerQueueIds[currentlyPlayingIndex]
      : undefined;
  const isOurTrackPlaying =
    currentPlayingTrackId !== undefined && ids.includes(currentPlayingTrackId);

  const onPause = React.useCallback(
    (e: any) => {
      if (ids.length > 0 && embeddedInMirlo) {
        sendPlayerRequest({ type: "pause", trackId: ids[0] });
      } else {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch, embeddedInMirlo, ids, sendPlayerRequest]
  );

  const playMusic = React.useCallback(() => {
    if (ids.length > 0) {
      if (embeddedInMirlo) {
        sendPlayerRequest({ type: "play", trackId: ids[0] });
      } else {
        dispatch({ type: "setPlayerQueueIds", playerQueueIds: ids });
        dispatch({ type: "setPlaying", playing: true });
      }
    }
  }, [ids, embeddedInMirlo, dispatch, sendPlayerRequest]);

  return (
    <div
      className={css`
        button {
          background-color: var(--mi-button-color);
          color: var(--mi-button-text-color);
          border: solid 1.5px var(--mi-button-color);
          width: 3rem;
          height: 3rem;
          svg {
            font-size: 1.5rem;
            fill: var(--mi-button-text-color);
          }
        }

        button:hover {
          color: var(--mi-button-color) !important;
          background-color: var(--mi-button-text-color) !important;

          svg {
            fill: var(--mi-button-color) !important;
          }
        }

        @media screen and (max-width: ${bp.small}px) {
          button {
            width: 2.25rem;
            height: 2.25rem;
            svg {
              font-size: 1.1rem;
            }
          }
        }
      `}
    >
      {(!playing || !isOurTrackPlaying) && (
        <Button
          onClick={playMusic}
          startIcon={<VscPlay />}
          className={css`
            svg {
              margin-left: 10%;
            }
          `}
        />
      )}
      {playing && isOurTrackPlaying && (
        <Button onClick={onPause} startIcon={<TfiControlPause />} />
      )}
    </div>
  );
};
