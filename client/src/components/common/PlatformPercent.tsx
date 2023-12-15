import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";
import { FiAlertCircle } from "react-icons/fi";

const PlatformPercent: React.FC<{
  percent: number;
  chosenPrice?: string | number;
}> = ({ percent, chosenPrice }) => {
  const chosenNumber =
    chosenPrice && isFinite(+chosenPrice) ? Number(chosenPrice) : null;
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!chosenNumber) {
    return null;
  }

  const amount = (chosenNumber * percent) / 100;

  return (
    <div
      className={css`
        margin-bottom: 0.5rem;
        font-size: 0.7rem;
        margin-top: 0.5rem;
      `}
    >
      {t("platformPercent", {
        percent,
        money: moneyDisplay({ amount }),
      })}
      <span
        className={css`
          margin-left: 0.2rem;
        `}
      >
        <FiAlertCircle /> {t("platformPercentDisclaimer")}
      </span>
    </div>
  );
};

export default PlatformPercent;
