import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";

const PlatformPercent: React.FC<{
  percent: number;
  chosenPrice?: string | number;
  currency: string;
  artistName?: string;
}> = ({ percent, chosenPrice, currency = "USD", artistName }) => {
  const chosenNumber =
    chosenPrice && isFinite(+chosenPrice) ? Number(chosenPrice) : null;
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!chosenNumber) {
    return null;
  }

  const amount = (chosenNumber * (100 - percent)) / 100;
  const paymentAmount = chosenNumber * 0.029 + 0.3;

  return (
    <div
      className={css`
        margin-bottom: 0.5rem;
        margin-top: 0.5rem;
        font-size: 0.8rem;
      `}
    >
      {t("platformPercent", {
        percent: (100 - percent).toFixed(),
        artistName: artistName ?? "the artist",
        money: moneyDisplay({ amount, currency }),
        mirloCut: moneyDisplay({
          amount: Number(chosenPrice) - amount,
          currency,
        }),
        paymentProcessorCut: moneyDisplay({
          amount: paymentAmount,
          currency,
        }),
      })}
    </div>
  );
};

export default PlatformPercent;
