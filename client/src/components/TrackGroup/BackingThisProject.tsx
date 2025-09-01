import { css } from "@emotion/css";
import Confetti from "components/common/Confetti";
import { moneyDisplay } from "components/common/Money";
import React from "react";

const BackingThisProject: React.FC<{ amount: number; currency: string }> = ({
  amount,
  currency,
}) => {
  return (
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
      <span>
        Backing this project for{" "}
        {moneyDisplay({
          amount: amount / 100,
          currency,
        })}
      </span>
    </div>
  );
};

export default BackingThisProject;
