export const fundraiserPercent = (amountRaised: number, goalAmount: number) =>
  goalAmount > 0 ? Math.floor((amountRaised * 100) / goalAmount) : 0;
