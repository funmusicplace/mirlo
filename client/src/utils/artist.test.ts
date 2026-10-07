import { describe, expect, test } from "vitest";

import { buildCheckoutCompletePath } from "./artist";

describe("buildCheckoutCompletePath", () => {
  test("builds the checkout-complete path with query params", () => {
    expect(
      buildCheckoutCompletePath(
        { urlSlug: "Test-Artist" },
        { purchaseType: "trackGroup", trackGroupId: "3" }
      )
    ).toBe(
      "/test-artist/checkout-complete?purchaseType=trackGroup&trackGroupId=3"
    );
  });

  test("encodes the buyer email exactly once", () => {
    const path = buildCheckoutCompletePath(
      { urlSlug: "test-artist" },
      { purchaseType: "trackGroup", email: "user+tag@example.com" }
    );
    expect(path).toContain("email=user%2Btag%40example.com");
    expect(new URL(path, "http://localhost").searchParams.get("email")).toBe(
      "user+tag@example.com"
    );
  });

  test("percent-encodes non-ASCII artist slugs in the path", () => {
    const path = buildCheckoutCompletePath(
      { urlSlug: "bjørk" },
      { purchaseType: "tip" }
    );
    expect(path).toBe("/bj%C3%B8rk/checkout-complete?purchaseType=tip");
  });
});
