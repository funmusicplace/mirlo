import React from "react";
import { MdSkipPrevious } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./Button";

export const PrevButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { dispatch } = useGlobalStateContext();

  const onClickPrev = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <Button
      startIcon={<MdSkipPrevious size={compact ? undefined : 22} />}
      variant="transparent"
      className={compact ? "!h-6 !w-6 !p-1" : undefined}
      aria-label="Play previous track"
      onClick={onClickPrev}
    />
  );
};

export default PrevButton;
