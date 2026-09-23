import React from "react";
import { useTranslation } from "react-i18next";

import { finishedLanguages } from "../../i18n";

export const TRANSLATION_BANNER_STORAGE_KEY = "mirlo-hide-translation-banner";
export const TRANSLATION_GUIDE_URL =
  "https://docs.mirlo.space/maintaining/translation#how-to-get-started";

/**
 * The name of the language in that language, e.g. "Português" rather than
 * "Portuguese". Intl does the localizing, which matters here: this banner is
 * shown to people whose language we haven't translated the site into yet.
 */
const localLanguageName = (language: string) => {
  try {
    const displayNames = new Intl.DisplayNames([language], {
      type: "language",
    });
    return displayNames.of(language) ?? undefined;
  } catch {
    return undefined;
  }
};

export const isUntranslatedLanguage = (language?: string) => {
  if (!language) {
    return false;
  }
  return !finishedLanguages.some((lang) => language.startsWith(lang.short));
};

const TranslationHelpBanner: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "common" });
  const [isDismissed, setIsDismissed] = React.useState(() => {
    try {
      return (
        window.localStorage.getItem(TRANSLATION_BANNER_STORAGE_KEY) === "true"
      );
    } catch {
      // Private windows and blocked site data throw on access.
      return false;
    }
  });

  const browserLanguage =
    typeof navigator !== "undefined" ? navigator.language : undefined;

  if (isDismissed || !isUntranslatedLanguage(browserLanguage)) {
    return null;
  }

  const languageName = localLanguageName(browserLanguage as string);

  if (!languageName) {
    return null;
  }

  const dismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(TRANSLATION_BANNER_STORAGE_KEY, "true");
    } catch {
      // Not remembering the dismissal is survivable.
    }
  };

  return (
    <div className="w-full flex items-center justify-center gap-4 text-sm px-4 py-2 bg-(--mi-darken-background-color)">
      <span>
        {t("helpTranslateBanner", { language: languageName })}{" "}
        <a
          href={TRANSLATION_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {t("helpTranslateBannerLink")}
        </a>
      </span>
      <button type="button" onClick={dismiss} className="underline shrink-0">
        {t("dismiss")}
      </button>
    </div>
  );
};

export default TranslationHelpBanner;
