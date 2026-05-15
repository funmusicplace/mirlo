import React from "react";
import { MdSkipNext } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./Button";

export const NextButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const {
    // state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onClickNext = React.useCallback(() => {
    dispatch({ type: "incrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <Button
      startIcon={<MdSkipNext size={compact ? undefined : 22} />}
      variant="transparent"
      onlyIcon={compact}
      className={compact ? "!h-6 !w-6 !p-1" : undefined}
      aria-label="Play next track"
      onClick={onClickNext}
    />
  );
};

export default NextButton;
