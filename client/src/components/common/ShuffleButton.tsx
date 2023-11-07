import React from "react";

import { RxShuffle } from "react-icons/rx";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";

export const ShuffleButton: React.FC = () => {
  const {
    state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onShuffle = React.useCallback(() => {
    dispatch({ type: "setShuffle", shuffle: !shuffle });
  }, [dispatch, shuffle]);
  return (
    <IconButton role={shuffle ? "primary" : undefined} onClick={onShuffle}>
      <RxShuffle />
    </IconButton>
  );
};

export default ShuffleButton;
