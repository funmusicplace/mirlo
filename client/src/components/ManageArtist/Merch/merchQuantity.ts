// Merch (and merch option) stock quantity semantics:
//   null = unlimited stock, 0 = none available, positive = limited stock.
// A blank field means unlimited (null), but a typed 0 must be preserved as 0.
export const toQuantityOrNull = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
