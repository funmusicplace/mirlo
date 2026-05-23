import React from "react";

import Button from "./Button";
import Money from "./Money";

const AddMoneyValueButtons: React.FC<{
  addMoneyAmount: (val: number) => void;
  currency?: string;
}> = ({ addMoneyAmount, currency }) => {
  return (
    <div className="grid grid-cols-4 gap-2 max-md:[&_button]:text-xs! max-md:[&_button]:px-1.5!">
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
