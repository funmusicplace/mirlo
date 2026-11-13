import { describe, expect, it } from "vitest";

import { getContrastRatio } from "./colors";
import {
  getEffectiveHighContrast,
  normalizeArtistColors,
  resolveArtistColors,
  shouldApplyArtistHighContrast,
} from "./resolveArtistColors";

describe("getEffectiveHighContrast", () => {
  it.each([
    ["system", true, true],
    ["system", false, false],
    ["on", true, true],
    ["on", false, true],
    ["off", true, false],
    ["off", false, false],
    [undefined, true, true],
    [undefined, false, false],
  ] as const)(
    "preference %s with prefersContrastMore %s => %s",
    (preference, prefersContrastMore, expected) => {
      expect(getEffectiveHighContrast(preference, prefersContrastMore)).toBe(
        expected
      );
    }
  );
});

describe("shouldApplyArtistHighContrast", () => {
  it("is false when account HC is off", () => {
    expect(
      shouldApplyArtistHighContrast({
        preference: "off",
        prefersContrastMore: true,
        artistId: 1,
      })
    ).toBe(false);
  });

  it("is false when this artist is in the opt-out list", () => {
    expect(
      shouldApplyArtistHighContrast({
        preference: "on",
        prefersContrastMore: false,
        artistId: 42,
        highContrastOffArtistIds: [7, 42],
      })
    ).toBe(false);
  });

  it("is true when HC is on and artist is not opted out", () => {
    expect(
      shouldApplyArtistHighContrast({
        preference: "on",
        prefersContrastMore: false,
        artistId: 42,
        highContrastOffArtistIds: [7],
      })
    ).toBe(true);
  });
});

describe("normalizeArtistColors", () => {
  it("falls back secondaryText to text", () => {
    expect(normalizeArtistColors({ text: "#111111" })).toEqual({
      button: undefined,
      buttonText: undefined,
      background: undefined,
      text: "#111111",
      secondaryText: "#111111",
    });
  });
});

describe("resolveArtistColors", () => {
  const artistColors: ArtistColors = {
    background: "#be3455",
    text: "#ffffff",
    button: "#000000",
    buttonText: "#ffffff",
  };

  it("ignores artist colors when high contrast is on", () => {
    expect(
      resolveArtistColors(artistColors, {
        highContrast: true,
      })
    ).toEqual({
      background: "#ffffff",
      text: "#111111",
      secondaryText: "#111111",
      button: "#be3455",
      buttonText: "#ffffff",
    });
  });

  it("normalizes artist colors when high contrast is off", () => {
    expect(resolveArtistColors(artistColors)).toEqual({
      ...artistColors,
      secondaryText: "#ffffff",
    });
  });
});

describe("high contrast palettes", () => {
  it("light palette matches default theme colors with strong text contrast", () => {
    const colors = resolveArtistColors(undefined, {
      highContrast: true,
    });
    expect(colors).toEqual({
      background: "#ffffff",
      text: "#111111",
      secondaryText: "#111111",
      button: "#be3455",
      buttonText: "#ffffff",
    });
    expect(
      getContrastRatio(colors.text!, colors.background!)
    ).toBeGreaterThanOrEqual(7);
    expect(
      getContrastRatio(colors.secondaryText!, colors.background!)
    ).toBeGreaterThanOrEqual(7);
    // Brand red / white matches site defaults (AA, not AAA).
    expect(
      getContrastRatio(colors.buttonText!, colors.button!)
    ).toBeGreaterThanOrEqual(4.5);
  });
});
