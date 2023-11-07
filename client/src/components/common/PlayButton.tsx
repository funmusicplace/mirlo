import React from "react";
import { css } from "@emotion/css";
import { VscPlay } from "react-icons/vsc";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onPlay = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  return (
    <div
      className={css`
          button {
            font-size: 1.4rem;
            margin-right: 0.25rem;
            padding: .7rem .7rem .7rem .9rem;
            border: solid 1.5px var(--mi-normal-foreground-color);
            border-color: var(--mi-normal-foreground-color);
            background-color: var(--mi-normal-foreground-color);
            color: var(--mi-normal-background-color);
          }
      `}
      >
    <IconButton onClick={onPlay}>

      <VscPlay  />

    </IconButton></div>
  );
};

export default PlayButton;
