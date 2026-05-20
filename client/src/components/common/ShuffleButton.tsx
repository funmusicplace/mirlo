import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { RxShuffle } from "react-icons/rx";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./Button";

export const ShuffleButton: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "player" });
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
      aria-label={t("shuffleMusic")}
      aria-pressed={!!shuffle}
      variant={shuffle ? "default" : "outlined"}
      className={css`
        ${shuffle ? "color: white !important;" : ""}
      `}
    />
  );
};

export default ShuffleButton;
