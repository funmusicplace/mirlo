import { APIResponseError } from "services/api";

const MAX_FONT_FILE_BYTES = 1.5 * 1024 * 1024;
export const MAX_FILES_PER_FONT = 8;
export const MAX_FONTS = 10;
export const FONT_ACCEPT = ".woff2,.woff,.ttf,.otf";
export const FONT_SIZE_LABEL = `${MAX_FONT_FILE_BYTES / 1024 / 1024} MB`;

export const FONT_SCRIPT_KEYS: Record<string, string> = {
  latin: "fontScriptLatin",
  "latin-accents": "fontScriptLatinAccents",
  cyrillic: "fontScriptCyrillic",
  greek: "fontScriptGreek",
  vietnamese: "fontScriptVietnamese",
};

const FONT_WEIGHT_KEYS: Record<number, string> = {
  100: "fontWeightThin",
  200: "fontWeightExtraLight",
  300: "fontWeightLight",
  400: "fontWeightRegular",
  500: "fontWeightMedium",
  600: "fontWeightSemiBold",
  700: "fontWeightBold",
  800: "fontWeightExtraBold",
  900: "fontWeightBlack",
};

export const fontWeightKey = (weight: number) =>
  FONT_WEIGHT_KEYS[
    Math.min(900, Math.max(100, Math.round(weight / 100) * 100))
  ];

const DEFAULT_LANGUAGE_SCRIPTS = ["latin", "latin-accents"];

const LANGUAGES_WITH_OWN_LETTERS = [
  "cs",
  "eo",
  "et",
  "hr",
  "hu",
  "lt",
  "lv",
  "pl",
  "ro",
  "sk",
  "sl",
  "tr",
];

const LANGUAGE_SCRIPTS: Record<string, string[]> = {
  en: ["latin"],
  ...Object.fromEntries(
    LANGUAGES_WITH_OWN_LETTERS.map((code) => [code, ["latin", `lang:${code}`]])
  ),
  be: ["cyrillic"],
  bg: ["cyrillic"],
  kk: ["cyrillic"],
  mk: ["cyrillic"],
  ru: ["cyrillic"],
  uk: ["cyrillic"],
  el: ["greek"],
  vi: ["latin", "vietnamese"],
};

export const hasRegularStyle = (font: Font) =>
  font.files.some(
    (file) =>
      file.style === "normal" && file.weightMin <= 400 && file.weightMax >= 400
  );

export const languagesMissingFromFont = <T extends { short: string }>(
  font: Font,
  languages: T[]
) => {
  const covered = new Set(font.files.flatMap((file) => file.scripts));
  return languages.filter((language) =>
    (
      LANGUAGE_SCRIPTS[language.short.split(/[_-]/)[0].toLowerCase()] ??
      DEFAULT_LANGUAGE_SCRIPTS
    ).some((script) => !covered.has(script))
  );
};

export const findTooLargeFile = (files: File[]) =>
  files.find((file) => file.size > MAX_FONT_FILE_BYTES);

export const fontErrorMessage = (e: unknown, fallback: string) =>
  e instanceof APIResponseError && e.status < 500 ? e.message : fallback;
