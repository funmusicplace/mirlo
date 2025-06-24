import React from "react";

import { MdSkipPrevious } from "react-icons/md";
import Button from "./Button";
import { useGlobalStateContext } from "state/GlobalState";

export const PreviousButton: React.FC = () => {
  const { dispatch } = useGlobalStateContext();

  const onClickPrevious = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <Button
      startIcon={<MdSkipPrevious />}
      variant="transparent"
      aria-label="Play previous track"
      onClick={onClickPrevious}
    />
  );
};

export default PreviousButton;
