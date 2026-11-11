import assert from "assert";

import { describe, it } from "mocha";

import { determinePrice } from "../../src/utils/purchasing";

describe("determinePrice", () => {
  it("refuses a price that isn't a number", () => {
    for (const price of ["abc", "Infinity", "1e400"]) {
      assert.throws(
        () => determinePrice(price, 100),
        (e: { httpCode?: number }) => e.httpCode === 400,
        price
      );
    }
  });

  it("uses the minimum when no price is given", () => {
    assert.deepEqual(determinePrice(undefined, 100), {
      priceNumber: 100,
      isPriceZero: false,
    });
  });
});
