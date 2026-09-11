import React from "react";

import Button from "./Button";
import Money from "./Money";

const SUGGESTED_PERCENTAGES = [10, 20, 30, 50];

const FALLBACK_AMOUNTS = [1, 2, 5, 10];

export const suggestedAddAmounts = (basePriceInCents?: number) => {
  const base = (basePriceInCents ?? 0) / 100;

  if (!isFinite(base) || base <= 0) {
    return FALLBACK_AMOUNTS;
  }

  let previous = 0;
  return SUGGESTED_PERCENTAGES.map((percent) => {
    const amount = Math.max(1, Math.round((base * percent) / 100));
    previous = Math.max(amount, previous + 1);
    return previous;
  });
};

const AddMoneyValueButtons: React.FC<{
  addMoneyAmount: (val: number) => void;
  currency?: string;
  basePrice?: number;
}> = ({ addMoneyAmount, currency, basePrice }) => {
  const amounts = suggestedAddAmounts(basePrice);

  return (
    <div className="grid grid-cols-4 gap-2 max-md:[&_button]:text-xs! max-md:[&_button]:px-1.5!">
      {amounts.map((amount) => (
        <Button
          key={amount}
          variant="dashed"
          type="button"
          onClick={() => addMoneyAmount(amount)}
        >
          +<Money amount={amount} currency={currency} />
        </Button>
      ))}
    </div>
  );
};

export default AddMoneyValueButtons;
