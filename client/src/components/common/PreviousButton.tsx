import React from "react";
import { useTranslation } from "react-i18next";
import { MdSkipPrevious } from "react-icons/md";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./Button";

export const PreviousButton: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });
  const { dispatch } = useGlobalStateContext();

  const onClickPrevious = React.useCallback(() => {
    dispatch({ type: "decrementCurrentlyPlayingIndex" });
  }, [dispatch]);

  return (
    <Button
      startIcon={<MdSkipPrevious size={22} />}
      variant="transparent"
      aria-label={t("previousTrack")}
      onClick={onClickPrevious}
    />
  );
};

export default PreviousButton;
