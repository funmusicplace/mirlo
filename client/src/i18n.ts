import { TransifexI18next } from "@transifex/i18next";
import i18n from "i18next";
import { uniqBy } from "lodash";
import { initReactI18next } from "react-i18next";
import * as en from "translation/en.json";
import { getInjectedLanguages } from "utils/injectedData";

const hasTransifex = !!import.meta.env.VITE_TRANSIFEX_TOKEN;

const txBackend = new TransifexI18next({
  token: import.meta.env.VITE_TRANSIFEX_TOKEN,
  // other options from @transifex/native init function
});
// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: en,
  },
};

const userLanguage = navigator.language;

const fallbackLanguages = [
  { short: "en", name: "English" },
  { short: "fr", name: "Français" },
  { short: "es", name: "Español" },
  { short: "uk", name: "Українська" },
  { short: "de", name: "Deutsch" },
];

const buildLanguageList = () => {
  const injected = getInjectedLanguages();
  if (!injected || injected.length === 0) {
    return fallbackLanguages;
  }
  const withKnownNames = injected.map((lang) => ({
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

export const finishedLanguages = buildLanguageList();

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

const browserLanguage = matchLanguage(userLanguage);

const defaultLanguage = getStoredLanguage() ?? browserLanguage?.short;

if (hasTransifex) {
  i18n.use(txBackend);
}

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources, // always bundle en.json as fallback if remote translations fail
    ...(hasTransifex ? { partialBundledLanguages: true } : {}),
    lng: defaultLanguage ?? "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
