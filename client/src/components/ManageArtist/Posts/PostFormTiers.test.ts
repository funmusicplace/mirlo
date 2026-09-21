import { describe, expect, it } from "vitest";

import { tiersForLegacyMinimumTier, tiersForPost } from "./PostForm";

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

describe("tiersForPost", () => {
  it("ticks the tiers the post already addresses", () => {
    expect(
      tiersForPost(
        { postSubscriptionTiers: [{ profileSubscriptionTierId: 3 }] },
        tiers
      )
    ).toEqual(["3"]);
  });

  it("ticks nothing for a public post with no tiers", () => {
    expect(tiersForPost({}, tiers)).toEqual([]);
    expect(tiersForPost(undefined, tiers)).toEqual([]);
  });

  it("expands a legacy minimum tier once the tier list is there", () => {
    expect(tiersForPost({ minimumSubscriptionTierId: 2 }, tiers)).toEqual([
      "2",
      "3",
    ]);
  });

  it("returns undefined for a legacy post before the tiers have loaded", () => {
    // Sending [] here would wipe the post's tiers server side.
    expect(tiersForPost({ minimumSubscriptionTierId: 2 }, [])).toBeUndefined();
  });

  it("doesn't need the tier list for a post that already has tiers", () => {
    expect(
      tiersForPost(
        {
          minimumSubscriptionTierId: 2,
          postSubscriptionTiers: [{ profileSubscriptionTierId: 1 }],
        },
        []
      )
    ).toEqual(["1"]);
  });
});
