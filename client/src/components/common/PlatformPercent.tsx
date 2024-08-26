import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";

const PlatformPercent: React.FC<{
  percent: number;
  chosenPrice?: string | number;
  currency: string;
  artist?: Pick<Artist, "name">;
}> = ({ percent, chosenPrice, currency = "USD", artist }) => {
  const chosenNumber =
    chosenPrice && isFinite(+chosenPrice) ? Number(chosenPrice) : null;
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!chosenNumber) {
    return null;
  }

  const amount = (chosenNumber * (100 - percent)) / 100;

  return (
    <div
      className={css`
        margin-bottom: 0.5rem;
        font-size: 0.7rem;
        margin-top: 0.5rem;
      `}
    >
      {t("platformPercent", {
        percent: (100 - percent).toFixed(),
        artistName: artist?.name ?? "the artist",
        money: moneyDisplay({ amount, currency }),
      })}
    </div>
  );
};

export default PlatformPercent;
