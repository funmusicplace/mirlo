import React from "react";

import { FaPause } from "react-icons/fa";
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
    <IconButton onClick={onPause}>
      <FaPause />
    </IconButton>
  );
};

export default PauseButton;
