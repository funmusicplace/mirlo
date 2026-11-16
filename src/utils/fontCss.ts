import { FontFormat } from "@mirlo/prisma/client";

import type { SerializedFontFile } from "../serializers/font";

const CSS_FONT_FORMATS: Record<FontFormat, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

const cssString = (value: string) =>
  `"${value.replace(/[\\"<>\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}"`;

const cssWeight = (file: SerializedFontFile) =>
  file.weightMin === file.weightMax
    ? `${file.weightMin}`
    : `${file.weightMin} ${file.weightMax}`;

const cssMetrics = (file: SerializedFontFile) =>
  file.ascentOverride !== null && file.descentOverride !== null
    ? ` ascent-override: ${file.ascentOverride}%; descent-override: ${file.descentOverride}%; line-gap-override: 0%;`
    : "";

export const fontStack = (family: string, fallback: string) =>
  `${cssString(family)}, ${fallback}`;

export const fontFaceCss = (family: string, files: SerializedFontFile[]) =>
  files
    .map(
      (file) =>
        `@font-face { font-family: ${cssString(family)}; src: url(${cssString(file.url)}) format("${CSS_FONT_FORMATS[file.format]}"); font-weight: ${cssWeight(file)}; font-style: ${file.style}; font-display: swap;${cssMetrics(file)} }`
    )
    .join("\n");

export const regularFontFile = (files: SerializedFontFile[]) =>
  files.find(
    (file) =>
      file.style === "normal" && file.weightMin <= 400 && file.weightMax >= 400
  ) ?? files[0];
