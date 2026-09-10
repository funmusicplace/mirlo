import { test, expect } from "vitest";

import { suggestedAddAmounts } from "./AddMoneyValueButtons";

test("offers 10/20/30/50% of the price, in whole units", () => {
  expect(suggestedAddAmounts(11500)).toEqual([12, 23, 35, 58]);
});

test("rounds to the nearest whole unit rather than a float", () => {
  expect(suggestedAddAmounts(1000)).toEqual([1, 2, 3, 5]);
  expect(suggestedAddAmounts(10000)).toEqual([10, 20, 30, 50]);
});

test("keeps the four amounts distinct and ascending on cheap items", () => {
  const amounts = suggestedAddAmounts(200);
  expect(amounts).toEqual([1, 2, 3, 4]);
  expect(amounts.every((a, i) => i === 0 || a > amounts[i - 1])).toBe(true);
});

test("never suggests adding nothing", () => {
  expect(suggestedAddAmounts(100).every((a) => a >= 1)).toBe(true);
});

test("falls back to flat amounts when there is no price to work from", () => {
  expect(suggestedAddAmounts(0)).toEqual([1, 2, 5, 10]);
  expect(suggestedAddAmounts(undefined)).toEqual([1, 2, 5, 10]);
  expect(suggestedAddAmounts(NaN)).toEqual([1, 2, 5, 10]);
});
