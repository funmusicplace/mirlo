import { describe, expect, test } from "vitest";

import {
  buildCheckoutCompletePath,
  formatTrackArtistLine,
  getArtistLinkUrl,
  getReleaseArtistLinks,
  getReleaseArtistName,
  getTrackArtistsByAppearance,
  hasCreditedReleaseArtists,
} from "./artist";

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

const joinGuests = (main: string, featured: string) =>
  `${main} with ${featured}`;

describe("getReleaseArtistLinks", () => {
  test("returns the server-resolved release artists", () => {
    const releaseArtists = [
      { name: "Ada", urlSlug: "ada", artistId: 1 },
      { name: "Theo" },
    ];
    expect(getReleaseArtistLinks({ releaseArtists })).toEqual(releaseArtists);
  });

  test("returns nothing when the field is absent", () => {
    expect(getReleaseArtistLinks({})).toEqual([]);
  });
});

describe("getReleaseArtistName", () => {
  test("joins the release artists for the locale", () => {
    expect(
      getReleaseArtistName(
        { releaseArtists: [{ name: "Ada" }, { name: "Theo" }] },
        "en"
      )
    ).toBe("Ada and Theo");
  });

  test("is empty when the field is absent", () => {
    expect(getReleaseArtistName({}, "en")).toBe("");
  });
});

describe("hasCreditedReleaseArtists", () => {
  test("is true only for credited release artists", () => {
    expect(
      hasCreditedReleaseArtists({ releaseArtistsSource: "credited" })
    ).toBe(true);
    expect(hasCreditedReleaseArtists({ releaseArtistsSource: "owner" })).toBe(
      false
    );
    expect(hasCreditedReleaseArtists({})).toBe(false);
  });
});

describe("getTrackArtistsByAppearance", () => {
  test("keeps the main artists when they come from the track", () => {
    expect(
      getTrackArtistsByAppearance({
        mainArtists: [{ name: "Ada", artistId: 1 }],
        featuredArtists: [{ name: "Theo" }],
        mainArtistsSource: "track",
      })
    ).toEqual({
      main: [{ name: "Ada", artistId: 1 }],
      featured: [{ name: "Theo" }],
    });
  });

  test("drops the main artists inherited from the release", () => {
    expect(
      getTrackArtistsByAppearance({
        mainArtists: [{ name: "Ada" }],
        featuredArtists: [],
        mainArtistsSource: "release",
      })
    ).toEqual({ main: [], featured: [] });
  });

  test("returns empty lists when the fields are absent", () => {
    expect(getTrackArtistsByAppearance({})).toEqual({ main: [], featured: [] });
  });
});

describe("formatTrackArtistLine", () => {
  test("joins the main artists for the locale", () => {
    expect(
      formatTrackArtistLine(
        { mainArtists: [{ name: "Ada" }, { name: "Theo" }] },
        joinGuests,
        "en"
      )
    ).toBe("Ada and Theo");
  });

  test("adds the featured artists", () => {
    expect(
      formatTrackArtistLine(
        {
          mainArtists: [{ name: "Ada" }],
          featuredArtists: [{ name: "Theo" }, { name: "Ines" }],
        },
        joinGuests,
        "en"
      )
    ).toBe("Ada with Theo and Ines");
  });

  test("is empty when the fields are absent", () => {
    expect(formatTrackArtistLine({}, joinGuests, "en")).toBe("");
  });
});

describe("getArtistLinkUrl", () => {
  test("prefers the artist slug", () => {
    expect(getArtistLinkUrl({ name: "Ada", urlSlug: "Ada", artistId: 1 })).toBe(
      "/ada"
    );
  });

  test("falls back to the artist id", () => {
    expect(getArtistLinkUrl({ name: "Ada", artistId: 1 })).toBe("/1");
  });

  test("has no url for an unlinked name", () => {
    expect(getArtistLinkUrl({ name: "Ada" })).toBeUndefined();
  });
});
