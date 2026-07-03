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
      className={shuffle ? "hover:border-[--mi-button-color] focus-visible:border-[--mi-button-color] hover:bg-[--mi-button-color] focus-visible:bg-[--mi-button-color] hover:text-[--mi-button-text-color] focus-visible:text-[--mi-button-text-color] hover:filter-[brightness(95%)_saturate(30%)] focus-visible:filter-[brightness(95%)_saturate(30%)]" : ""}
    />
  );
};

export default ShuffleButton;
