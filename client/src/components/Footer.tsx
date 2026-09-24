import { css } from "@emotion/css";
import { finishedLanguages, setStoredLanguage } from "i18n";
import { Trans, useTranslation } from "react-i18next";
import { FaInstagram, FaMastodon } from "react-icons/fa";
import { FaBluesky } from "react-icons/fa6";
import { Link } from "react-router-dom";

import { bp } from "../constants";

import { SelectEl } from "./common/Select";
import WidthContainer from "./common/WidthContainer";

export const Footer = () => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "footer" });

  const onChangeLanguage = (language: string) => {
    setStoredLanguage(language);
    i18n.changeLanguage(language);
  };

  return (
    <footer
      className={css`
        text-align: left;
        display: block;
        margin: 0rem auto;
        padding: var(--mi-side-paddings-normal);
        max-width: var(--mi-container-big);
        z-index: 2;
        width: 100%;

        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          padding: 0;
          z-index: 0;
        }
      `}
    >
      <WidthContainer variant="big" justify="center">
        <div
          className={`text-sm ${css`
            padding: 2rem;
          `}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mbe-8">
            <div>
              <h2 className="text-sm! font-bold! mbe-2">{t("aboutHeading")}</h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <a href="https://docs.mirlo.space">{t("about")}</a>
                </li>
                <li>
                  <a href="https://docs.mirlo.space">{t("documentation")}</a>
                </li>
                <li>
                  <a href="mailto:hi@mirlo.space">{t("contact")}</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm! font-bold! mbe-2">{t("legalHeading")}</h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link to="/pages/terms">{t("terms")}</Link>
                </li>
                <li>
                  <Link to="/pages/privacy">{t("privacy")}</Link>
                </li>
                <li>
                  <Link to="/pages/cookie-policy">{t("cookies")}</Link>
                </li>
                <li>
                  <Link to="/pages/content-policy">{t("content")}</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm! font-bold! mbe-2">
                {t("connectHeading")}
              </h2>
              <ul className="flex flex-col gap-2">
                <li>
                  <a href="https://instagram.com/mirlo.space" title="Instagram">
                    <span className="inline-flex items-center gap-2">
                      <FaInstagram aria-hidden /> Instagram
                    </span>
                  </a>
                </li>
                <li>
                  <a href="https://musician.social/@mirlo" title="Mastodon">
                    <span className="inline-flex items-center gap-2">
                      <FaMastodon aria-hidden /> Mastodon
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://bsky.app/profile/mirlo.space"
                    title="Bluesky"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaBluesky aria-hidden /> Bluesky
                    </span>
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm! font-bold! mbe-2">{t("language")}</h2>
              <div className="flex flex-col gap-2 items-start">
                <SelectEl
                  id="footer-language"
                  className="w-auto!"
                  value={
                    finishedLanguages.find(
                      (lang) => lang.short === i18n.resolvedLanguage
                    )?.short ?? "en"
                  }
                  onChange={(e) => onChangeLanguage(e.target.value)}
                >
                  {finishedLanguages.map((lang) => (
                    <option key={lang.short} value={lang.short}>
                      {lang.name}
                    </option>
                  ))}
                </SelectEl>
                <a
                  href="https://docs.mirlo.space/maintaining/translation#how-to-get-started"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("helpTranslate")}
                </a>
              </div>
            </div>
          </div>
          <p className="text-xs">
            <Trans
              t={t}
              i18nKey="getInTouch"
              components={{
                github: <a href="https://github.com/funmusicplace/mirlo/"></a>,
                discord: <a href="https://discord.gg/VjKq26raKX"></a>,
                email: <a href="mailto:mirlodotspace@proton.me"></a>,
              }}
            />
          </p>
        </div>
      </WidthContainer>
    </footer>
  );
};
