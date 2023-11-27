import React from "react";
import { css } from "@emotion/css";
import { VscPlay } from "react-icons/vsc";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayButton: React.FC<{
  onPlay?: () => Promise<void> | void;
  className?: string;
}> = ({ onPlay, className }) => {
  const { dispatch } = useGlobalStateContext();

  const onPlayCallback = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  return (
    <div
      className={
        css`
          button {
            font-size: 1.4rem;
            margin-right: 0.25rem;
            padding: 0.7rem 0.6rem 0.7rem 0.8rem;
            border: solid 1.5px var(--mi-normal-foreground-color);
            border-color: var(--mi-white);
            background-color: var(--mi-black);
            color: var(--mi-white);
          }
        ` +
        " " +
        className
      }
    >
      <IconButton onClick={onPlay ?? onPlayCallback}>
        <VscPlay />
      </IconButton>
    </div>
  );
};

export default PlayButton;
