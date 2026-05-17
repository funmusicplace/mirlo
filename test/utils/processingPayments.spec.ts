import * as dotenv from "dotenv";
dotenv.config();

import assert from "node:assert";
import { describe, it } from "mocha";

import {
  calculateAppFee,
  calculatePlatformPercent,
} from "../../src/utils/processingPayments";

describe("utils/processingPayments", () => {
  describe("calculatePlatformPercent", () => {
    it("returns the supplied percent for normal cases", async () => {
      const percent = await calculatePlatformPercent("usd", 10);
      assert.equal(percent, 10);
    });

    it("returns 0 for MXN currency (#1614)", async () => {
      const percent = await calculatePlatformPercent("MXN", 10);
      assert.equal(percent, 0);
    });

    it("returns 0 for BRL currency", async () => {
      const percent = await calculatePlatformPercent("brl", 10);
      assert.equal(percent, 0);
    });

    it("returns 0 for connected accounts in MX even when display currency is USD (#1614)", async () => {
      const percent = await calculatePlatformPercent("usd", 10, "MX");
      assert.equal(
        percent,
        0,
        "Stripe doesn't allow cross-border app fees to MX accounts"
      );
    });

    it("returns 0 for connected accounts in BR even when display currency is USD", async () => {
      const percent = await calculatePlatformPercent("usd", 10, "br");
      assert.equal(percent, 0);
    });

    it("ignores country casing", async () => {
      const percent = await calculatePlatformPercent("usd", 10, "mx");
      assert.equal(percent, 0);
    });
  });

  describe("calculateAppFee", () => {
    it("returns the rounded fee for normal cases", async () => {
      const fee = await calculateAppFee(1000, "usd", 10);
      assert.equal(fee, 100);
    });

    it("returns 0 for MX connected accounts on USD charges (#1614)", async () => {
      const fee = await calculateAppFee(1000, "usd", 10, "MX");
      assert.equal(fee, 0);
    });

    it("returns 0 for BR connected accounts on USD charges", async () => {
      const fee = await calculateAppFee(1000, "usd", 10, "BR");
      assert.equal(fee, 0);
    });

    it("still returns 0 when currency is MXN regardless of country", async () => {
      const fee = await calculateAppFee(1000, "MXN", 10, "US");
      assert.equal(fee, 0);
    });
  });
});
