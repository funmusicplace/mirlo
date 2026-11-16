import assert from "node:assert";

import { describe, it } from "mocha";

import type { SerializedFontFile } from "../../src/serializers/font";
import {
  fontFaceCss,
  fontStack,
  regularFontFile,
} from "../../src/utils/fontCss";

const file = (
  overrides: Partial<SerializedFontFile> = {}
): SerializedFontFile => ({
  id: "regular",
  url: "https://cdn.test/fonts/font-1/regular.woff2",
  format: "woff2",
  weightMin: 400,
  weightMax: 400,
  style: "normal",
  scripts: ["latin"],
  ascentOverride: null,
  descentOverride: null,
  byteSize: 1000,
  ...overrides,
});

describe("fontCss", () => {
  it("declares one face per file with its weight range and format", () => {
    const css = fontFaceCss("mi-font-1", [
      file(),
      file({
        id: "variable",
        url: "https://cdn.test/fonts/font-1/variable.ttf",
        format: "ttf",
        weightMin: 100,
        weightMax: 900,
        style: "italic",
      }),
    ]);

    assert.ok(
      css.includes(
        '@font-face { font-family: "mi-font-1"; src: url("https://cdn.test/fonts/font-1/regular.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }'
      )
    );
    assert.ok(
      css.includes(
        'format("truetype"); font-weight: 100 900; font-style: italic'
      )
    );
  });

  it("centers the text with the metrics read at upload, when there are some", () => {
    assert.ok(!fontFaceCss("mi-font-1", [file()]).includes("ascent-override"));

    const css = fontFaceCss("mi-font-1", [
      file({ ascentOverride: 85.5, descentOverride: 14.5 }),
    ]);

    assert.ok(
      css.includes(
        "ascent-override: 85.5%; descent-override: 14.5%; line-gap-override: 0%;"
      )
    );
  });

  it("escapes characters that could close the string or the style tag", () => {
    const css = fontFaceCss("mi-font-1", [
      file({ url: 'https://cdn.test/x"</style>.woff2' }),
    ]);

    assert.ok(!css.includes("</style>"));
    assert.ok(
      css.includes('url("https://cdn.test/x\\22 \\3c /style\\3e .woff2")')
    );
  });

  it("builds the font-family value with the generic fallback", () => {
    assert.equal(fontStack("mi-font-1", "serif"), '"mi-font-1", serif');
  });

  it("picks the regular file, or the first one when there is none", () => {
    const bold = file({ id: "bold", weightMin: 700, weightMax: 700 });
    const variable = file({ id: "variable", weightMin: 100, weightMax: 900 });

    assert.equal(regularFontFile([bold, variable]).id, "variable");
    assert.equal(regularFontFile([bold]).id, "bold");
  });
});
