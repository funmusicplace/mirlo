import React from "react";
import Button from "./Button";
import Money from "./Money";
import { css } from "@emotion/css";

const AddMoneyValueButtons: React.FC<{
  addMoneyAmount: (val: number) => void;
  currency: string;
}> = ({ addMoneyAmount, currency }) => {
  return (
    <div
      className={css`
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
      `}
    >
      <Button variant="dashed" type="button" onClick={() => addMoneyAmount(1)}>
        +<Money amount={1} currency={currency} />
      </Button>
      <Button variant="dashed" type="button" onClick={() => addMoneyAmount(2)}>
        +<Money amount={2} currency={currency} />
      </Button>
      <Button variant="dashed" type="button" onClick={() => addMoneyAmount(5)}>
        +<Money amount={5} currency={currency} />
      </Button>
      <Button variant="dashed" type="button" onClick={() => addMoneyAmount(10)}>
        +<Money amount={10} currency={currency} />
      </Button>
    </div>
  );
};

export default AddMoneyValueButtons;
