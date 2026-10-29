import fs from "fs";
import path from "path";

import i18next, { i18n, TOptions } from "i18next";
import { escape } from "lodash";

const translationDir = path.resolve("client/src/translation");

let instance: i18n | undefined;

const loadResources = () =>
  Object.fromEntries(
    fs
      .readdirSync(translationDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => [
        path.basename(file, ".json"),
        {
          translation: JSON.parse(
            fs.readFileSync(path.join(translationDir, file), "utf8")
          ),
        },
      ])
  );

export const getEmailI18n = () => {
  if (!instance) {
    instance = i18next.createInstance();
    instance.init({
      resources: loadResources(),
      fallbackLng: "en",
      initImmediate: false,
      interpolation: { escapeValue: false, escape },
    });
  }
  return instance;
};

export const hasTranslation = (language: unknown): language is string =>
  typeof language === "string" &&
  getEmailI18n().hasResourceBundle(language, "translation");

const hasEmailTranslation = (language: string) =>
  hasTranslation(language) &&
  Object.keys(
    getEmailI18n().getResourceBundle(language, "translation") ?? {}
  ).some((key) => key.split(".")[0] === "emails");

const resolveLanguage = (language?: string | null) => {
  const candidates = language ? [language, language.split(/[-_]/)[0]] : [];
  return candidates.find(hasEmailTranslation) ?? "en";
};

export const getEmailLocals = (requestedLanguage?: string | null) => {
  const language = resolveLanguage(requestedLanguage);
  const locale = language.replace(/_/g, "-");
  const t = getEmailI18n().getFixedT(language);
  const amountFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    language,
    t,
    tHtml: (key: string, options?: TOptions) =>
      t(key, { ...options, interpolation: { escapeValue: true } }),
    formatAmount: (cents: number) => amountFormat.format(cents / 100),
    formatMoney: (cents: number, currency: string) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency.toUpperCase(),
        }).format(cents / 100);
      } catch {
        return `${currency.toUpperCase()} ${amountFormat.format(cents / 100)}`;
      }
    },
    formatDate: (date: Date | string) =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(date)),
  };
};
