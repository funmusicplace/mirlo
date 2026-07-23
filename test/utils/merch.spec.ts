import * as dotenv from "dotenv";
dotenv.config();

import assert from "node:assert";

import { describe, it } from "mocha";

import { AppError } from "../../src/utils/error";
import {
  calculateMerchShippingCost,
  checkMerchStock,
  MerchWithOptionsAndShipping,
  resolveMerchOptionIds,
} from "../../src/utils/merch";

const baseMerch = (
  overrides: Partial<MerchWithOptionsAndShipping> = {}
): MerchWithOptionsAndShipping =>
  ({
    id: "merch-1",
    minPrice: 1000,
    quantityRemaining: 10,
    optionTypes: [],
    shippingDestinations: [],
    ...overrides,
  }) as MerchWithOptionsAndShipping;

describe("utils/merch", () => {
  describe("resolveMerchOptionIds", () => {
    const merch = baseMerch({
      optionTypes: [
        {
          id: "ot-1",
          options: [
            { id: "opt-small", additionalPrice: 0, quantityRemaining: 5 },
            { id: "opt-large", additionalPrice: 200, quantityRemaining: 2 },
          ],
        },
      ] as any,
    });

    it("returns no add-on when no options are selected", () => {
      const result = resolveMerchOptionIds(merch, undefined);
      assert.deepEqual(result, { options: [], additionalPricePerUnit: 0 });
    });

    it("sums additionalPrice across selected options", () => {
      const result = resolveMerchOptionIds(merch, ["opt-small", "opt-large"]);
      assert.deepEqual(result.options.map((o) => o.id).sort(), [
        "opt-large",
        "opt-small",
      ]);
      assert.equal(result.additionalPricePerUnit, 200);
    });

    it("throws 400 for an option id that doesn't belong to this merch item", () => {
      assert.throws(
        () => resolveMerchOptionIds(merch, ["not-a-real-option"]),
        (e: unknown) => e instanceof AppError && e.httpCode === 400
      );
    });
  });

  describe("calculateMerchShippingCost", () => {
    // Whether a merch item ships at all (and thus whether a
    // shippingDestinationId is required) is the caller's job — see the
    // 400 test for a missing shippingDestinationId in
    // test/routers/purchase.spec.ts. This function always assumes a
    // non-empty shippingDestinations list.
    const usDestination = {
      id: "dest-1",
      destinationCountry: "US",
      costUnit: 500,
      costExtraUnit: 100,
    };

    it("charges costUnit once and costExtraUnit for each additional item", () => {
      const result = calculateMerchShippingCost([usDestination], "dest-1", 3);
      assert.equal(result.costCents, 500 + 2 * 100);
      assert.deepEqual(result.allowedCountries, ["US"]);
      assert.equal(result.destinationCountry, "US");
    });

    it("throws 400 for a destination id that isn't valid for this seller", () => {
      assert.throws(
        () =>
          calculateMerchShippingCost([usDestination], "not-a-destination", 1),
        (e: unknown) => e instanceof AppError && e.httpCode === 400
      );
    });
  });

  describe("checkMerchStock", () => {
    it("throws 400 when quantity exceeds merch-level stock", () => {
      const merch = baseMerch({ quantityRemaining: 2 });
      assert.throws(
        () => checkMerchStock(merch, [], 3),
        (e: unknown) => e instanceof AppError && e.httpCode === 400
      );
    });

    it("throws 400 when quantity exceeds a selected option's stock", () => {
      const option = {
        id: "opt-small",
        additionalPrice: 0,
        quantityRemaining: 1,
      };
      const merch = baseMerch({
        quantityRemaining: 100,
        optionTypes: [{ id: "ot-1", options: [option] }] as any,
      });
      assert.throws(
        () => checkMerchStock(merch, [option as any], 2),
        (e: unknown) => e instanceof AppError && e.httpCode === 400
      );
    });

    it("does not throw when there's enough stock", () => {
      const merch = baseMerch({ quantityRemaining: 5 });
      assert.doesNotThrow(() => checkMerchStock(merch, [], 5));
    });

    it("does not throw when quantityRemaining is null (unlimited stock)", () => {
      const merch = baseMerch({ quantityRemaining: null });
      assert.doesNotThrow(() => checkMerchStock(merch, [], 1000));
    });
  });
});
