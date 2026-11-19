import {
  Font,
  FontCategory,
  FontFile,
  FontFormat,
  FontStyle,
} from "@mirlo/prisma/client";

import { fontFaceCss, fontStack } from "../utils/fontCss";
import { generateFullStaticImageUrl } from "../utils/images";
import { fontFileName, fontPrefix } from "../utils/storage";

export type FontWithFiles = Font & { files: FontFile[] };

export type SerializedFontFile = {
  id: string;
  url: string;
  format: FontFormat;
  weightMin: number;
  weightMax: number;
  style: FontStyle;
  scripts: string[];
  ascentOverride: number | null;
  descentOverride: number | null;
  byteSize: number;
};

export type SerializedFont = {
  id: string;
  name: string;
  family: string;
  stack: string;
  css: string;
  files: SerializedFontFile[];
};

const FONT_FALLBACKS: Record<FontCategory, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
  display: "sans-serif",
  handwriting: "cursive",
};

const fontFamilyName = (fontId: string) => `mi-font-${fontId}`;

const compareFiles = (a: FontFile, b: FontFile) =>
  a.style === b.style
    ? a.weightMin - b.weightMin
    : a.style === "normal"
      ? -1
      : 1;

const serializeFontFile = (file: FontFile): SerializedFontFile => ({
  id: file.id,
  url: generateFullStaticImageUrl(
    fontFileName(file.fontId, file.id),
    fontPrefix,
    file.format,
    { throughApi: true }
  ),
  format: file.format,
  weightMin: file.weightMin,
  weightMax: file.weightMax,
  style: file.style,
  scripts: file.scripts,
  ascentOverride: file.ascentOverride,
  descentOverride: file.descentOverride,
  byteSize: file.byteSize,
});

export const serializeFont = (font: FontWithFiles): SerializedFont => {
  const family = fontFamilyName(font.id);
  const files = [...font.files].sort(compareFiles).map(serializeFontFile);
  return {
    id: font.id,
    name: font.name,
    family,
    stack: fontStack(family, FONT_FALLBACKS[font.category]),
    css: fontFaceCss(family, files),
    files,
  };
};

export const serializeOptionalFont = (
  font: FontWithFiles | null | undefined
): SerializedFont | null =>
  font && font.files.length > 0 ? serializeFont(font) : null;
