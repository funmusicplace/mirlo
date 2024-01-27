import { css } from "@emotion/css";
import IconButton from "components/common/IconButton";
import React from "react";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import { inIframe, inMirlo } from "./utils";

export const PlayButtonsWrapper: React.FC<{ ids: number[] }> = ({ ids }) => {
  const {
    state: { playing },
    dispatch,
  } = useGlobalStateContext();
  const embeddedInMirlo = inIframe() && inMirlo();

  const onPause = React.useCallback(
    (e: any) => {
      if (ids.length > 0 && embeddedInMirlo) {
        window.parent.postMessage("mirlo:pause:track:" + ids[0]);
      } else {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch, embeddedInMirlo, ids]
  );

  const playMusic = React.useCallback(() => {
    if (ids.length > 0) {
      if (embeddedInMirlo) {
        window.parent.postMessage("mirlo:play:track:" + ids[0]);
      } else {
        dispatch({ type: "setPlayerQueueIds", playerQueueIds: ids });
        dispatch({ type: "setPlaying", playing: true });
      }
    }
  }, [ids, embeddedInMirlo, dispatch]);

  return (
    <div
      className={css`
        button {
          font-size: 1.4rem !important;
          background-color: var(--mi-normal-foreground-color);
          color: var(--mi-normal-background-color);
          border: solid 1.5px var(--mi-normal-foreground-color) !important;
          width: 3rem !important;
          height: 3rem !important;
        }

        @media (prefers-color-scheme: dark) {
          button {
            background-color: var(--mi-normal-foreground-color);
            color: var(--mi-normal-background-color);
          }
          button:hover {
            color: var(--mi-normal-foreground-color) !important;
          }
        }
      `}
    >
      {!playing && (
        <IconButton
          onClick={playMusic}
          className={css`
          padding-left: 0.85rem !important;
        }
      `}
        >
          <VscPlay />
        </IconButton>
      )}
      {(playing || embeddedInMirlo) && (
        <IconButton
          onClick={onPause}
          className={css`
          padding: 0.75rem !important;
          ${embeddedInMirlo && "display: none;"}
        }
      `}
        >
          <TfiControlPause />
        </IconButton>
      )}
    </div>
  );
};
