import React from "react";
import { css } from "@emotion/css";
import { TfiControlPause } from "react-icons/tfi";
import { useGlobalStateContext } from "state/GlobalState";
import { isEqualDurations } from "utils/tracks";
import Button from "./Button";
import { useTranslation } from "react-i18next";

export const PauseButton: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { dispatch } = useGlobalStateContext();

  const { t } = useTranslation("translation", { keyPrefix: "clickToPlay" });

  const onPause = React.useCallback(
    (e: any) => {
      // onPause gets triggered both onEnded and onPause, so we need
      // a way to differntiate those.
      if (!isEqualDurations(e.target.currentTime, e.target.duration)) {
        dispatch({ type: "setPlaying", playing: false });
      }
    },
    [dispatch]
  );

  return (
    <div>
      <Button
        startIcon={<TfiControlPause />}
        aria-label={`${t("pause")}`}
        title={`${t("pause")}`}
        onClick={onPause}
        variant="outlined"
        className={
          css`
            font-size: 1.6rem;
            margin-right: 0.25rem;
            padding: 0.75rem 0.7rem 0.65rem 0.7rem;
            border: solid 1.5px !important;
          ` +
          " " +
          className
        }
      />
    </div>
  );
};

export default PauseButton;
