import React from "react";

import { MdSkipPrevious } from "react-icons/md";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const PreviousButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onClickPrevious = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <IconButton onClick={onClickPrevious}>
      <MdSkipPrevious/>
    </IconButton>
  );
};

export default PreviousButton;
