import { randomUUID } from "crypto";

import prisma from "@mirlo/prisma";
import { FontCategory, FontFormat, FontStyle } from "@mirlo/prisma/client";
import { Request } from "express";
import { fromBuffer } from "file-type";
import type { Font as FontkitFont } from "fontkit";
import { validate as uuidValidate } from "uuid";

import logger from "../logger";
import { FontWithFiles } from "../serializers/font";

import { AppError, HttpCode } from "./error";
import { BufferedUpload, readBufferedUploads } from "./file";
import { clearPageCache } from "./pageCache";
import { stripNullBytes } from "./sanitize";
import { removeFontFile, removeFontFiles, uploadFontFile } from "./storage";

export const MAX_FONT_FILE_BYTES = 1.5 * 1024 * 1024;
export const MAX_FILES_PER_FONT = 8;
export const MAX_FONTS = 10;
const MAX_FONT_NAME_LENGTH = 100;
const FONT_COLLECTION_SIGNATURE = Buffer.from("ttcf");

const FONT_FORMATS: Record<string, FontFormat> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
};

const FAMILY_CLASS_CATEGORIES: Record<number, FontCategory> = {
  1: "serif",
  2: "serif",
  3: "serif",
  4: "serif",
  5: "serif",
  7: "serif",
  8: "sans",
  9: "display",
  10: "handwriting",
};

const PANOSE_LATIN_TEXT = 2;
const PANOSE_LATIN_HAND_WRITTEN = 3;
const PANOSE_LATIN_DECORATIVE = 4;
const PANOSE_MONOSPACED = 9;
const PANOSE_SANS_SERIF_STYLES = [11, 12, 13, 14, 15];

const FONT_SCRIPT_SAMPLES: Record<string, string> = {
  latin: "AZaz",
  "latin-accents": "àçéñöü",
  cyrillic: "АЖЯажя",
  greek: "ΑΩαω",
  vietnamese: "ơưạệ",
  "lang:cs": "čďěňřšťůž",
  "lang:eo": "ĉĝĥĵŝŭ",
  "lang:et": "õäöüšž",
  "lang:hr": "čćđšž",
  "lang:hu": "áéíóöőúüű",
  "lang:lt": "ąčęėįšųūž",
  "lang:lv": "āčēģīķļņšūž",
  "lang:pl": "ąćęłńóśźż",
  "lang:ro": "ăâîșț",
  "lang:sk": "áäčďéíĺľňóôŕšťúýž",
  "lang:sl": "čšž",
  "lang:tr": "çğıöşü",
};

type ProcessedFontFile = {
  buffer: Buffer;
  format: FontFormat;
  weightMin: number;
  weightMax: number;
  style: FontStyle;
  scripts: string[];
  category: FontCategory;
  ascentOverride: number | null;
  descentOverride: number | null;
  familyName: string;
  originalFilename: string;
};

type WeightRange = Pick<
  ProcessedFontFile,
  "weightMin" | "weightMax" | "style"
> & { originalFilename?: string | null };

const badRequest = (description: string) =>
  new AppError({ httpCode: HttpCode.BAD_REQUEST, description });

const rejectFormat = (filename: string) =>
  badRequest(`${filename} is not a WOFF2, WOFF, TTF or OTF font file.`);

export const readFontUpload = async (req: Request) => {
  const result = await readBufferedUploads(req);
  if (!result) {
    throw badRequest("Send the font files as multipart form data.");
  }
  if (result.tooLargeFilename !== undefined) {
    throw new AppError({
      httpCode: HttpCode.PAYLOAD_TOO_LARGE,
      description: `${result.tooLargeFilename} is larger than ${MAX_FONT_FILE_BYTES / 1024 / 1024} MB.`,
    });
  }
  if (result.hasTooManyFiles) {
    throw badRequest(`A font can have at most ${MAX_FILES_PER_FONT} files.`);
  }
  return result.uploads;
};

const clampWeight = (weight: number) =>
  Math.min(1000, Math.max(1, Math.round(weight)));

const inferCategory = (os2?: {
  sFamilyClass?: number;
  panose?: number[];
}): FontCategory => {
  const [familyType, serifStyle, , proportion] = os2?.panose ?? [];
  if (familyType === PANOSE_LATIN_TEXT && proportion === PANOSE_MONOSPACED) {
    return "mono";
  }
  const fromFamilyClass =
    FAMILY_CLASS_CATEGORIES[(os2?.sFamilyClass ?? 0) >> 8];
  if (fromFamilyClass) {
    return fromFamilyClass;
  }
  if (familyType === PANOSE_LATIN_TEXT) {
    return serifStyle > 1 && !PANOSE_SANS_SERIF_STYLES.includes(serifStyle)
      ? "serif"
      : "sans";
  }
  if (familyType === PANOSE_LATIN_HAND_WRITTEN) {
    return "handwriting";
  }
  if (familyType === PANOSE_LATIN_DECORATIVE) {
    return "display";
  }
  return "sans";
};

const toPercent = (value: number, unitsPerEm: number) =>
  Math.round((value / unitsPerEm) * 10000) / 100;

const centeredMetrics = (font: FontkitFont) => {
  const os2 = font["OS/2"];
  const [ascent, descent] = os2?.fsSelection?.useTypoMetrics
    ? [os2.typoAscender, -os2.typoDescender]
    : [font.ascent, -font.descent];
  const capHeight =
    font.capHeight || font.glyphForCodePoint(0x48)?.bbox?.maxY || 0;
  const below = (ascent + descent - capHeight) / 2;
  if (!font.unitsPerEm || capHeight <= 0 || below < 0) {
    return { ascentOverride: null, descentOverride: null };
  }
  return {
    ascentOverride: toPercent(below + capHeight, font.unitsPerEm),
    descentOverride: toPercent(below, font.unitsPerEm),
  };
};

const processFontFile = async (
  upload: BufferedUpload
): Promise<ProcessedFontFile> => {
  if (
    upload.buffer
      .subarray(0, FONT_COLLECTION_SIGNATURE.length)
      .equals(FONT_COLLECTION_SIGNATURE)
  ) {
    throw badRequest(
      `${upload.filename} is a font collection. Upload each font of the collection as its own file.`
    );
  }
  const detected = await fromBuffer(upload.buffer);
  const format = detected ? FONT_FORMATS[detected.mime] : undefined;
  if (!format) {
    throw rejectFormat(upload.filename);
  }
  const { create } = await import("fontkit");
  let parsed;
  try {
    parsed = create(upload.buffer);
  } catch {
    throw rejectFormat(upload.filename);
  }
  if (!("characterSet" in parsed)) {
    throw rejectFormat(upload.filename);
  }
  try {
    const os2 = parsed["OS/2"];
    if (os2?.fsType?.noEmbedding) {
      throw badRequest(
        `The license of ${upload.filename} does not allow embedding it in web pages.`
      );
    }
    const weightAxis = parsed.variationAxes.wght;
    const weight = os2?.usWeightClass || 400;
    return {
      buffer: upload.buffer,
      format,
      weightMin: clampWeight(weightAxis?.min ?? weight),
      weightMax: clampWeight(weightAxis?.max ?? weight),
      style:
        os2?.fsSelection?.italic || parsed.italicAngle !== 0
          ? "italic"
          : "normal",
      scripts: Object.entries(FONT_SCRIPT_SAMPLES)
        .filter(([, letters]) =>
          [...letters].every((letter) =>
            parsed.hasGlyphForCodePoint(letter.codePointAt(0) ?? 0)
          )
        )
        .map(([script]) => script),
      category: inferCategory(os2),
      ...centeredMetrics(parsed),
      familyName:
        stripNullBytes(
          parsed.getName("preferredFamily", "en") || parsed.familyName
        )?.trim() ?? "",
      originalFilename: upload.filename,
    };
  } catch (e) {
    if (e instanceof AppError) {
      throw e;
    }
    throw rejectFormat(upload.filename);
  }
};

const rangesOverlap = (a: WeightRange, b: WeightRange) =>
  a.style === b.style &&
  a.weightMin <= b.weightMax &&
  b.weightMin <= a.weightMax;

const assertNoOverlap = (
  incoming: ProcessedFontFile[],
  existing: WeightRange[]
) => {
  incoming.forEach((file, index) => {
    const clash = [...existing, ...incoming.slice(0, index)].find((other) =>
      rangesOverlap(file, other)
    );
    if (clash) {
      throw badRequest(
        `${file.originalFilename} covers the same weight and style as ${clash.originalFilename ?? "a file already in this font"}.`
      );
    }
  });
};

const processUploads = async (uploads: BufferedUpload[]) => {
  const processed: ProcessedFontFile[] = [];
  for (const upload of uploads) {
    processed.push(await processFontFile(upload));
  }
  return processed;
};

const storeFontFiles = async (fontId: string, files: ProcessedFontFile[]) => {
  const stored: { id: string; format: FontFormat }[] = [];
  const discard = () =>
    Promise.all(
      stored.map((file) =>
        removeFontFile(fontId, file.id, file.format).catch((e) => {
          logger.error(`Could not remove font file ${fontId}/${file.id}`);
          logger.error(e);
        })
      )
    );
  try {
    for (const file of files) {
      const id = randomUUID();
      await uploadFontFile(fontId, id, file.format, file.buffer);
      stored.push({ id, format: file.format });
    }
  } catch (e) {
    await discard();
    throw e;
  }
  return {
    rows: files.map(({ buffer, familyName, category, ...file }, index) => ({
      ...file,
      id: stored[index].id,
      byteSize: buffer.length,
    })),
    discard,
  };
};

const assertHasUploads = (uploads: BufferedUpload[]) => {
  if (uploads.length === 0) {
    throw badRequest("Add at least one font file.");
  }
};

const fontNotFound = () =>
  new AppError({
    httpCode: HttpCode.NOT_FOUND,
    description: "This font does not exist.",
  });

const fontFileNotFound = () =>
  new AppError({
    httpCode: HttpCode.NOT_FOUND,
    description: "This font file does not exist.",
  });

const findFont = async (fontId: string) => {
  const font = uuidValidate(fontId)
    ? await prisma.font.findUnique({
        where: { id: fontId },
        include: { files: true },
      })
    : null;
  if (!font) {
    throw fontNotFound();
  }
  return font;
};

export const assertFontIdExists = async (fontId: unknown) => {
  if (fontId === undefined || fontId === null) {
    return;
  }
  const exists =
    typeof fontId === "string" &&
    uuidValidate(fontId) &&
    (await prisma.font.count({ where: { id: fontId } })) > 0;
  if (!exists) {
    throw badRequest("The chosen font does not exist.");
  }
};

export const listFonts = () =>
  prisma.font.findMany({
    include: { files: true },
    orderBy: { createdAt: "asc" },
  });

export const createFont = async (
  uploads: BufferedUpload[]
): Promise<FontWithFiles> => {
  assertHasUploads(uploads);
  if ((await prisma.font.count()) >= MAX_FONTS) {
    throw badRequest(
      `The library can hold at most ${MAX_FONTS} fonts. Delete one first.`
    );
  }
  const files = await processUploads(uploads);
  assertNoOverlap(files, []);
  const fontId = randomUUID();
  const { rows, discard } = await storeFontFiles(fontId, files);
  try {
    const font = await prisma.font.create({
      data: {
        id: fontId,
        name: (
          files[0].familyName ||
          files[0].originalFilename.replace(/\.[^.]+$/, "")
        ).slice(0, MAX_FONT_NAME_LENGTH),
        category: files[0].category,
        files: { create: rows },
      },
      include: { files: true },
    });
    return font;
  } catch (e) {
    await discard();
    throw e;
  }
};

export const addFontFiles = async (
  fontId: string,
  uploads: BufferedUpload[]
): Promise<FontWithFiles> => {
  assertHasUploads(uploads);
  const font = await findFont(fontId);
  if (font.files.length + uploads.length > MAX_FILES_PER_FONT) {
    throw badRequest(`A font can have at most ${MAX_FILES_PER_FONT} files.`);
  }
  const files = await processUploads(uploads);
  assertNoOverlap(files, font.files);
  const { rows, discard } = await storeFontFiles(fontId, files);
  try {
    await prisma.fontFile.createMany({
      data: rows.map((row) => ({ ...row, fontId })),
    });
  } catch (e) {
    await discard();
    throw e;
  }
  clearPageCache();
  return findFont(fontId);
};

export const deleteFont = async (fontId: string) => {
  await findFont(fontId);
  await prisma.font.delete({ where: { id: fontId } });
  clearPageCache();
  try {
    await removeFontFiles(fontId);
  } catch (e) {
    logger.error(`Could not remove the files of font ${fontId}`);
    logger.error(e);
  }
};

export const deleteFontFile = async (
  fontId: string,
  fileId: string
): Promise<FontWithFiles> => {
  const font = await findFont(fontId);
  const file = font.files.find((candidate) => candidate.id === fileId);
  if (!file) {
    throw fontFileNotFound();
  }
  if (font.files.length === 1) {
    throw badRequest(
      "A font needs at least one file. Delete the whole font instead."
    );
  }
  await prisma.fontFile.delete({ where: { id: fileId } });
  clearPageCache();
  try {
    await removeFontFile(fontId, fileId, file.format);
  } catch (e) {
    logger.error(`Could not remove font file ${fontId}/${fileId}`);
    logger.error(e);
  }
  return findFont(fontId);
};
