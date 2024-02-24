import { css } from "@emotion/css";
import React from "react";
import { TfiControlPause } from "react-icons/tfi";
import { VscPlay } from "react-icons/vsc";
import { useGlobalStateContext } from "state/GlobalState";
import { inIframe, inMirlo } from "./utils";
import Button from "components/common/Button";

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
          background-color: var(--mi-normal-foreground-color);
          color: var(--mi-normal-background-color);
          border: solid 1.5px var(--mi-normal-foreground-color) !important;
          width: 3rem;
          height: 3rem;
          svg {
            font-size: 1.5rem;
            margin-left: 10%;
          }
        }
        button:hover {
          color: var(--mi-normal-foreground-color) !important;
          background-color: var(--mi-normal-background-color) !important;
        }
      `}
    >
      {!playing && <Button onClick={playMusic} startIcon={<VscPlay />} />}
      {(playing || embeddedInMirlo) && (
        <Button
          onClick={onPause}
          startIcon={<TfiControlPause />}
          className={css`
          ${embeddedInMirlo && "display: none !important;"}
        }
      `}
        />
      )}
    </div>
  );
};
