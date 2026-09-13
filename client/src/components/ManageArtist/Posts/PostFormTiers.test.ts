import { describe, expect, it } from "vitest";

import { tiersForLegacyMinimumTier } from "./PostForm";

// Posts written before #1253 stored a single "minimum tier", which meant that
// tier and anything costing at least as much. Opening one of those in the
// multi-tier form has to tick exactly that set, or saving it would silently
// narrow who can read it.
const tier = (id: number, minAmount?: number) =>
  ({ id, minAmount, name: `tier-${id}` }) as ArtistSubscriptionTier;

const tiers = [tier(1, 300), tier(2, 500), tier(3, 1000)];

describe("tiersForLegacyMinimumTier", () => {
  it("ticks the minimum tier and everything above it", () => {
    expect(tiersForLegacyMinimumTier(tiers, 2)).toEqual(["2", "3"]);
  });

  it("ticks every tier when the minimum is the cheapest one", () => {
    expect(tiersForLegacyMinimumTier(tiers, 1)).toEqual(["1", "2", "3"]);
  });

  it("ticks nothing when the post had no minimum tier", () => {
    expect(tiersForLegacyMinimumTier(tiers, undefined)).toEqual([]);
  });

  it("ticks nothing when the minimum tier no longer exists", () => {
    expect(tiersForLegacyMinimumTier(tiers, 99)).toEqual([]);
  });

  it("treats a tier without a minimum amount as free", () => {
    const withFree = [tier(4), ...tiers];
    expect(tiersForLegacyMinimumTier(withFree, 4)).toEqual([
      "4",
      "1",
      "2",
      "3",
    ]);
  });
});
