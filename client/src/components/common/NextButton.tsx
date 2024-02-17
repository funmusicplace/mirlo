import React from "react";

import { MdSkipNext } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./Button";

export const NextButton: React.FC = () => {
  const {
    // state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onClickNext = React.useCallback(() => {
    dispatch({ type: "incrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return <Button startIcon={<MdSkipNext />} onClick={onClickNext} />;
};

export default NextButton;
