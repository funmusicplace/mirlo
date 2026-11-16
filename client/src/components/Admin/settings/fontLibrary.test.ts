import { describe, expect, test } from "vitest";

import { hasRegularStyle, languagesMissingFromFont } from "./fontLibrary";

const file = (overrides: Partial<FontFile> = {}): FontFile => ({
  id: "file",
  url: "https://cdn.test/fonts/font-1/file.woff2",
  format: "woff2",
  weightMin: 400,
  weightMax: 400,
  style: "normal",
  scripts: ["latin", "latin-accents"],
  ascentOverride: null,
  descentOverride: null,
  byteSize: 1000,
  ...overrides,
});

const font = (files: FontFile[]): Font => ({
  id: "font-1",
  name: "Poster",
  family: "mi-font-font-1",
  stack: '"mi-font-font-1", serif',
  css: "",
  files,
});

describe("hasRegularStyle", () => {
  test("accepts a regular file or a variable file that covers 400", () => {
    expect(hasRegularStyle(font([file()]))).toBe(true);
    expect(
      hasRegularStyle(font([file({ weightMin: 300, weightMax: 700 })]))
    ).toBe(true);
  });

  test("refuses fonts with only bold, light or italic files", () => {
    expect(
      hasRegularStyle(
        font([
          file({ weightMin: 700, weightMax: 700 }),
          file({ weightMin: 300, weightMax: 300 }),
          file({ style: "italic" }),
        ])
      )
    ).toBe(false);
  });
});

describe("languagesMissingFromFont", () => {
  const languages = [
    { short: "en", name: "English" },
    { short: "fr", name: "Français" },
    { short: "uk", name: "Українська" },
    { short: "pt_BR", name: "Português (Brasil)" },
  ];

  test("lists the languages whose letters the font lacks", () => {
    expect(
      languagesMissingFromFont(font([file()]), languages).map(
        (language) => language.short
      )
    ).toEqual(["uk"]);
  });

  test("checks Central European languages against their own letters", () => {
    const polish = [{ short: "pl", name: "Polski" }];

    expect(
      languagesMissingFromFont(
        font([file({ scripts: ["latin", "lang:pl"] })]),
        polish
      )
    ).toEqual([]);
    expect(
      languagesMissingFromFont(
        font([file({ scripts: ["latin", "lang:hu"] })]),
        polish
      )
    ).toEqual(polish);
  });

  test("flags accented languages when the font only has basic Latin", () => {
    expect(
      languagesMissingFromFont(
        font([file({ scripts: ["latin", "cyrillic"] })]),
        languages
      ).map((language) => language.short)
    ).toEqual(["fr", "pt_BR"]);
  });
});
