import React from "react";

import { FaPlay } from "react-icons/fa";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PlayButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onPlay = React.useCallback(() => {
    dispatch({ type: "setPlaying", playing: true });
  }, [dispatch]);

  return (
    <IconButton onClick={onPlay}>
      <FaPlay />
    </IconButton>
  );
};

export default PlayButton;
