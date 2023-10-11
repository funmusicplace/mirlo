import React from "react";

import { FaForward } from "react-icons/fa";
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
      <FaForward />
    </IconButton>
  );
};

export default NextButton;
