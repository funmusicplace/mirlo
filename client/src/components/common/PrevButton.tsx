import React from "react";
import { MdSkipPrevious } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";

import { IconButton } from "./Button";

export const PrevButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { dispatch } = useGlobalStateContext();

  const onClickPrev = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <IconButton
      variant="transparent"
      className={compact ? "!h-6 !w-6 !p-1" : undefined}
      label="Play previous track"
      onClick={onClickPrev}
    >
      <MdSkipPrevious size={compact ? undefined : 22} />
    </IconButton>
  );
};

export default PrevButton;
