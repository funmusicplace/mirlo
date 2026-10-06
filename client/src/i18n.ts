import { TransifexI18next } from "@transifex/i18next";
import i18n, { BackendModule, ReadCallback } from "i18next";
import { uniqBy } from "lodash";
import { initReactI18next } from "react-i18next";
import * as en from "translation/en.json";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";

const hasTransifex = !!import.meta.env.VITE_TRANSIFEX_TOKEN;

const txBackend = hasTransifex
  ? new TransifexI18next({
      token: import.meta.env.VITE_TRANSIFEX_TOKEN,
      // other options from @transifex/native init function
    })
  : undefined;

// Translations pulled from Transifex by scripts/pull-translations.ts, so a
// build without a Transifex token still has every language. Loaded lazily so
// each language is its own chunk.
const bundledLocales = import.meta.glob<Record<string, string>>(
  ["./translation/*.json", "!./translation/en.json"],
  { import: "default" }
);

const loadBundled = async (language: string) => {
  const load =
    bundledLocales[`./translation/${language}.json`] ??
    bundledLocales[`./translation/${language.replace(/-/g, "_")}.json`];
  return load ? load() : {};
};

const loadFromTransifex = (language: string, namespace: string) =>
  new Promise<Record<string, string>>((resolve, reject) => {
    txBackend.read(
      language,
      namespace,
      (err: unknown, data: Record<string, string> | null) =>
        err ? reject(err) : resolve(data ?? {})
    );
  });

// Bundled translations first; when a token is set, Transifex's (newer)
// strings are layered on top. If Transifex fails we keep the bundled ones.
const translationBackend: BackendModule = {
  type: "backend",
  init: () => {},
  read: (language: string, namespace: string, callback: ReadCallback) => {
    const load = async () => {
      const bundled = await loadBundled(language);
      if (!txBackend) {
        return bundled;
      }
      try {
        return {
          ...bundled,
          ...(await loadFromTransifex(language, namespace)),
        };
      } catch (e) {
        console.error("Failed to load translations from Transifex", e);
        return bundled;
      }
    };
    load().then(
      (data) => callback(null, data),
      (err) => callback(err, false)
    );
  },
};
// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: en,
  },
};

const fallbackLanguages = [
  { short: "en", name: "English" },
  { short: "fr", name: "Français" },
  { short: "es", name: "Español" },
  { short: "uk", name: "Українська" },
  { short: "de", name: "Deutsch" },
];

const buildLanguageList = (offered: InstanceSettings["languages"]) => {
  const valid = (offered ?? []).filter(
    (lang) =>
      typeof lang?.short === "string" &&
      lang.short.length > 0 &&
      typeof lang?.name === "string"
  );
  if (valid.length === 0) {
    return fallbackLanguages;
  }
  const withKnownNames = valid.map((lang) => ({
    short: lang.short,
    name:
      fallbackLanguages.find((known) => known.short === lang.short)?.name ??
      (lang.name || lang.short),
  }));
  // English is the bundled source language and must always be offered.
  return uniqBy(
    [{ short: "en", name: "English" }, ...withKnownNames],
    (lang) => lang.short
  );
};

let finishedLanguages = fallbackLanguages;

export const getFinishedLanguages = () => finishedLanguages;

const normalizeCode = (code: string) => code.replace(/-/g, "_").toLowerCase();

export const matchLanguage = (code?: string) => {
  if (!code) {
    return undefined;
  }
  const normalized = normalizeCode(code);
  const base = normalized.split("_")[0];
  return (
    finishedLanguages.find(
      (lang) => normalizeCode(lang.short) === normalized
    ) ??
    finishedLanguages.find((lang) =>
      normalized.startsWith(`${normalizeCode(lang.short)}_`)
    ) ??
    finishedLanguages.find(
      (lang) => normalizeCode(lang.short).split("_")[0] === base
    )
  );
};

export const LANGUAGE_STORAGE_KEY = "mirlo-language";

export const getStoredLanguage = () => {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return finishedLanguages.some((lang) => lang.short === stored)
      ? (stored as string)
      : undefined;
  } catch {
    // Private windows and blocked site data throw on access.
    return undefined;
  }
};

export const setStoredLanguage = (language: string) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Not being able to remember it is survivable; the change still applies
    // for this page view.
  }
};

export const initI18n = (
  settings: InstanceSettings = DEFAULT_INSTANCE_SETTINGS
) => {
  finishedLanguages = buildLanguageList(settings.languages);

  const browserLanguage = matchLanguage(navigator.language);
  const defaultLanguage = getStoredLanguage() ?? browserLanguage?.short;

  return i18n
    .use(translationBackend)
    .use(initReactI18next)
    .init({
      resources, // en.json is bundled eagerly; other languages load via translationBackend
      partialBundledLanguages: true,
      lng: defaultLanguage ?? "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
      // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
      // if you're using a language detector, do not define the lng option
      fallbackLng: "en",
      interpolation: {
        escapeValue: false, // react already safes from xss
        defaultVariables: { instanceName: settings.name },
      },
    });
};

export default i18n;
