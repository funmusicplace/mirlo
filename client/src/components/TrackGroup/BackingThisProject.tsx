import { css } from "@emotion/css";
import Confetti from "components/common/Confetti";
import { moneyDisplay } from "components/common/Money";
import Tooltip from "components/common/Tooltip";
import React from "react";
import { useTranslation } from "react-i18next";

const BackingThisProject: React.FC<{
  amount: number;
  currency: string;
  collapse?: boolean;
}> = ({ amount, collapse, currency }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  return (
    <Tooltip hoverText={t("youWillBeChargedWhenItsFullyFunded")}>
      <div
        className={css`
          margin-left: 0.5rem;
          font-size: 1rem;
          margin-top: 0.35rem;
          display: flex;
          align-items: center;
          svg {
            width: 40px;
            margin-top: -0.5rem;
          }
        `}
      >
        <Confetti />

        {!collapse && (
          <span>
            {t("backingThisProjectFor", {
              amount: moneyDisplay({ amount: amount / 100, currency }),
            })}
          </span>
        )}
      </div>
    </Tooltip>
  );
};

export default BackingThisProject;
