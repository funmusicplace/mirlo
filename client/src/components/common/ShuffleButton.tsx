import React from "react";

import { RxShuffle } from "react-icons/rx";
import { useGlobalStateContext } from "state/GlobalState";
import { css } from "@emotion/css";
import Button from "./Button";

export const ShuffleButton: React.FC = () => {
  const {
    state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onShuffle = React.useCallback(() => {
    dispatch({ type: "setShuffle", shuffle: !shuffle });
  }, [dispatch, shuffle]);
  return (
    <Button
      startIcon={<RxShuffle />}
      buttonRole={shuffle ? "secondary" : undefined}
      onClick={onShuffle}
      className={css`
        ${shuffle ? "color: var(--mi-link-color) !important;" : ""}
      `}
    />
  );
};

export default ShuffleButton;
