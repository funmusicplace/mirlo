import { afterEach, describe, expect, test } from "vitest";

import { applyFontVariable, ensureFontFaces } from "./fonts";

const file = (id: string): FontFile => ({
  id,
  url: `https://cdn.test/fonts/font-1/${id}.woff2`,
  format: "woff2",
  weightMin: 400,
  weightMax: 400,
  style: "normal",
  scripts: ["latin"],
  ascentOverride: null,
  descentOverride: null,
  byteSize: 1000,
});

const font = (files: FontFile[], css: string): Font => ({
  id: "font-1",
  name: "Poster",
  family: "mi-font-font-1",
  stack: '"mi-font-font-1", serif',
  css,
  files,
});

afterEach(() => {
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("style");
});

describe("ensureFontFaces", () => {
  test("adds the faces once and refreshes them when the files change", () => {
    ensureFontFaces(font([file("regular")], "/* regular */"));
    ensureFontFaces(font([file("regular")], "/* regular */"));

    const styles = document.head.querySelectorAll(
      'style[data-font-id="font-1"]'
    );
    expect(styles).toHaveLength(1);

    ensureFontFaces(
      font([file("regular"), file("bold")], "/* regular and bold */")
    );

    const refreshed = document.head.querySelectorAll(
      'style[data-font-id="font-1"]'
    );
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0].textContent).toBe("/* regular and bold */");
  });
});

describe("applyFontVariable", () => {
  test("points the variable at the font and resets it to its fallback", () => {
    applyFontVariable("--mi-instance-font-body", font([file("regular")], ""));

    expect(
      document.documentElement.style.getPropertyValue("--mi-instance-font-body")
    ).toBe('"mi-font-font-1", serif');

    applyFontVariable("--mi-instance-font-body", null);

    expect(
      document.documentElement.style.getPropertyValue("--mi-instance-font-body")
    ).toBe("initial");
  });
});
