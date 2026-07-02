import { describe, expect, it } from "vitest";

import { getContrastRatio } from "./colors";
import {
  getEffectiveHighContrast,
  normalizeArtistColors,
  resolveArtistColors,
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
      expect(
        getEffectiveHighContrast(preference, prefersContrastMore)
      ).toBe(expected);
    }
  );
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
        prefersDark: false,
      })
    ).toEqual({
      background: "#ffffff",
      text: "#000000",
      secondaryText: "#595959",
      button: "#000000",
      buttonText: "#ffffff",
    });
  });

  it("uses dark palette when prefersDark", () => {
    const colors = resolveArtistColors(artistColors, {
      highContrast: true,
      prefersDark: true,
    });
    expect(colors.background).toBe("#000000");
    expect(colors.text).toBe("#ffffff");
  });

  it("normalizes artist colors when high contrast is off", () => {
    expect(resolveArtistColors(artistColors)).toEqual({
      ...artistColors,
      secondaryText: "#ffffff",
    });
  });
});

describe("high contrast palettes", () => {
  it("light palette meets AAA contrast for text pairs", () => {
    const colors = resolveArtistColors(undefined, {
      highContrast: true,
      prefersDark: false,
    });
    expect(getContrastRatio(colors.text!, colors.background!)).toBeGreaterThanOrEqual(
      7
    );
    expect(
      getContrastRatio(colors.secondaryText!, colors.background!)
    ).toBeGreaterThanOrEqual(7);
    expect(
      getContrastRatio(colors.buttonText!, colors.button!)
    ).toBeGreaterThanOrEqual(7);
  });

  it("dark palette meets AAA contrast for text pairs", () => {
    const colors = resolveArtistColors(undefined, {
      highContrast: true,
      prefersDark: true,
    });
    expect(getContrastRatio(colors.text!, colors.background!)).toBeGreaterThanOrEqual(
      7
    );
    expect(
      getContrastRatio(colors.secondaryText!, colors.background!)
    ).toBeGreaterThanOrEqual(7);
    expect(
      getContrastRatio(colors.buttonText!, colors.button!)
    ).toBeGreaterThanOrEqual(7);
  });
});
