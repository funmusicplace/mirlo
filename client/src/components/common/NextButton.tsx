import React from "react";
import { useTranslation } from "react-i18next";
import { MdSkipNext } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";

import { IconButton } from "./Button";

export const NextButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  const {
    // state: { shuffle },
    dispatch,
  } = useGlobalStateContext();

  const onClickNext = React.useCallback(() => {
    dispatch({ type: "incrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <IconButton
      variant="transparent"
      className={compact ? "!h-6 !w-6 !p-1" : undefined}
      label={t("nextTrack")}
      onClick={onClickNext}
    >
      <MdSkipNext size={compact ? undefined : 22} />
    </IconButton>
  );
};

export default NextButton;
