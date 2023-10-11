import React from "react";

import { FaBackward } from "react-icons/fa";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PreviousButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onClickPrevious = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <IconButton onClick={onClickPrevious}>
      <FaBackward />
    </IconButton>
  );
};

export default PreviousButton;
