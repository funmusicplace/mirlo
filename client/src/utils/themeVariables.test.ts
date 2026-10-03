import { describe, expect, test } from "vitest";

import { getBrightness, isLight } from "./colors";
import {
  ARTIST_THEME_PROFILE,
  SITE_THEME_PROFILE,
  deriveThemeVariables,
  isSchemeLight,
} from "./themeVariables";

const DEFAULT_INSTANCE_COLORS: ArtistColors = {
  button: "#be3455",
  buttonText: "#ffffff",
  background: "#ffffff",
  text: "#000000",
};

describe("deriveThemeVariables with the site profile", () => {
  test("reproduces the default Mirlo theme tints on the default colors", () => {
    expect(
      deriveThemeVariables(DEFAULT_INSTANCE_COLORS, SITE_THEME_PROFILE)
    ).toEqual({
      "--mi-instance-button-color": "#be3455",
      "--mi-instance-button-text-color": "#ffffff",
      "--mi-instance-background-color": "#ffffff",
      "--mi-instance-text-color": "#000000",
      "--mi-tint-color": "rgba(50, 0, 0, 0.03)",
      "--mi-tint-x-color": "rgba(50, 0, 0, 0.2)",
      "--mi-tint-xx-color": "rgba(50, 0, 0, 0.2)",
    });
  });

  test("uses light overlays on a dark background", () => {
    const variables = deriveThemeVariables(
      { ...DEFAULT_INSTANCE_COLORS, background: "#100306", text: "#ffffff" },
      SITE_THEME_PROFILE
    );
    expect(variables["--mi-tint-color"]).toBe("rgba(255, 255, 255, 0.08)");
    expect(variables["--mi-tint-x-color"]).toBe("rgba(255, 255, 255, 0.18)");
    expect(variables["--mi-tint-xx-color"]).toBe("rgba(255, 255, 255, 0.35)");
  });

  test("leaves button tints, contrast and fixed colors to theme.css", () => {
    const variables = deriveThemeVariables(
      DEFAULT_INSTANCE_COLORS,
      SITE_THEME_PROFILE
    );
    expect(variables).not.toHaveProperty("--mi-button-tint-color");
    expect(variables).not.toHaveProperty("--mi-contrast-color");
    expect(variables).not.toHaveProperty("--mi-fixed-bg-color");
    expect(variables).not.toHaveProperty("--mi-chip-brightness");
  });
});

describe("deriveThemeVariables with the artist profile", () => {
  test("derives every variable on a light page with a dark button", () => {
    expect(
      deriveThemeVariables(DEFAULT_INSTANCE_COLORS, ARTIST_THEME_PROFILE)
    ).toEqual({
      "--mi-button-color": "#be3455",
      "--mi-button-text-color": "#ffffff",
      "--mi-background-color": "#ffffff",
      "--mi-text-color": "#000000",
      "--mi-tint-color": "rgba(0, 0, 0, 0.05)",
      "--mi-tint-x-color": "rgba(0, 0, 0, 0.15)",
      "--mi-tint-xx-color": "rgba(0, 0, 0, 0.3)",
      "--mi-contrast-color": "#000000",
      "--mi-chip-brightness": ".9",
      "--mi-button-tint-color": "rgba(255, 255, 255, 0.06)",
      "--mi-button-tint-x-color": "rgba(255, 255, 255, 0.24)",
      "--mi-fixed-bg-color": "var(--mi-off-white)",
      "--mi-fixed-fg-color": "var(--mi-black)",
    });
  });

  test("derives every variable on a dark page with a light button", () => {
    expect(
      deriveThemeVariables(
        {
          background: "#100306",
          text: "#ffffff",
          secondaryText: "#727272",
          button: "#ffe5ea",
          buttonText: "#43141e",
        },
        ARTIST_THEME_PROFILE
      )
    ).toEqual({
      "--mi-background-color": "#100306",
      "--mi-text-color": "#ffffff",
      "--mi-secondary-text-color": "#727272",
      "--mi-button-color": "#ffe5ea",
      "--mi-button-text-color": "#43141e",
      "--mi-tint-color": "rgba(255, 255, 255, 0.08)",
      "--mi-tint-x-color": "rgba(255, 255, 255, 0.18)",
      "--mi-tint-xx-color": "rgba(255, 255, 255, 0.35)",
      "--mi-contrast-color": "#ffffff",
      "--mi-chip-brightness": "1.3",
      "--mi-button-tint-color": "rgba(0, 0, 0, 0.05)",
      "--mi-button-tint-x-color": "rgba(0, 0, 0, 0.2)",
      "--mi-fixed-bg-color": "var(--mi-black)",
      "--mi-fixed-fg-color": "var(--mi-off-white)",
    });
  });

  test("skips undefined and empty colors", () => {
    expect(
      deriveThemeVariables(
        { text: "#111111", button: "" },
        ARTIST_THEME_PROFILE
      )
    ).toEqual({ "--mi-text-color": "#111111" });
  });
});

describe("isSchemeLight", () => {
  test("treats a mid-tone background as light and a dark one as dark", () => {
    expect(isSchemeLight("#8b8083")).toBe(true);
    expect(isSchemeLight("#231f24")).toBe(false);
  });

  test("falls back to light for a color it cannot read", () => {
    expect(isSchemeLight("not-a-color")).toBe(true);
  });
});

describe("getBrightness", () => {
  test("reads hex colors with an alpha channel", () => {
    expect(getBrightness("#000000ff")).toBe(0);
    expect(getBrightness("#ffff")).toBe(255);
    expect(isLight("#000000ff")).toBe(false);
  });

  test("returns undefined for a value that is not a hex color", () => {
    expect(getBrightness("rgb(0, 0, 0)")).toBeUndefined();
  });
});
