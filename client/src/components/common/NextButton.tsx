import React from "react";

import { MdSkipNext } from "react-icons/md";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const NextButton: React.FC = () => {
  const {
    // state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onClickNext = React.useCallback(() => {
    dispatch({ type: "incrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <IconButton onClick={onClickNext}>
      <MdSkipNext />
    </IconButton>
  );
};

export default NextButton;
