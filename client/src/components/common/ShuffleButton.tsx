import React from "react";

import { RxShuffle } from "react-icons/rx";
import IconButton from "./IconButton";
import { useGlobalStateContext } from "state/GlobalState";
import { css } from "@emotion/css";

export const ShuffleButton: React.FC = () => {
  const {
    state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onShuffle = React.useCallback(() => {
    dispatch({ type: "setShuffle", shuffle: !shuffle });
  }, [dispatch, shuffle]);
  return (
    <IconButton
      role={shuffle ? "secondary" : undefined}
      onClick={onShuffle}
      className={css`
        ${shuffle ? "color: var(--mi-link-color) !important;" : ""}
      `}
    >
      <RxShuffle />
    </IconButton>
  );
};

export default ShuffleButton;
