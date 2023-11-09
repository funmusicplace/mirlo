import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { TransifexI18next } from "@transifex/i18next";

import * as en from "translation/en.json";

const hasTransifex = !!process.env.REACT_APP_TRANSIFEX_TOKEN;

const txBackend = new TransifexI18next({
  token: process.env.REACT_APP_TRANSIFEX_TOKEN,
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

const finishedLanguages = ["en", "fr"];

const defaultLanguage = finishedLanguages.find((lang) =>
  userLanguage.startsWith(lang)
);

if (hasTransifex) {
  i18n.use(txBackend);
}

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    ...(!hasTransifex ? { resources } : {}),
    lng: defaultLanguage ?? "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
