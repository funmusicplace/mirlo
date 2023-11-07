import React from "react";
import { css } from "@emotion/css";
import { TfiControlPause } from "react-icons/tfi";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";
import { isEqualDurations } from "utils/tracks";

export const PauseButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onPause = React.useCallback(
    (e: any) => {
      // onPause gets triggered both onEnded and onPause, so we need
      // a way to differntiate those.
      if (!isEqualDurations(e.target.currentTime, e.target.duration)) {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch]
  );

  return (
    <div
      className={css`
          button {
            font-size: 1.4rem;
            margin-right: 0.25rem;
            padding: .75rem .8rem .65rem .8rem;
            border: solid 1.5px var(--mi-normal-foreground-color);
            border-color: var(--mi-normal-foreground-color);
            background-color: var(--mi-normal-foreground-color);
            color: var(--mi-normal-background-color);
          }
          button:hover {
          }
      `}
      >
    <IconButton onClick={onPause}>
      <TfiControlPause />
    </IconButton>
    </div>
  );
};

export default PauseButton;
