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
      buttonRole={shuffle ? "primary" : undefined}
      onClick={onShuffle}
      aria-label="Shuffle music"
      variant={shuffle ? "default" : "outlined"}
      className={css`
        ${shuffle ? "color: white !important;" : ""}
      `}
    />
  );
};

export default ShuffleButton;
