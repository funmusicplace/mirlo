export function roundCurrency(amount: number, currency: string): number {
  const roundingMap = {
    'USD': 0.01,
    'JPY': 1,
    // Add more currencies as needed
  };

  const roundTo = roundingMap[currency] || 0.01;
  return Math.floor(amount / roundTo) * roundTo;
}