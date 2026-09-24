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

  const columns: {
    heading: string;
    links: { text: string; to?: string; href?: string; icon?: JSX.Element }[];
  }[] = [
    {
      heading: t("aboutHeading"),
      links: [
        { text: t("about"), href: "https://docs.mirlo.space" },
        { text: t("documentation"), href: "https://docs.mirlo.space" },
        { text: t("contact"), href: "mailto:hi@mirlo.space" },
      ],
    },
    {
      heading: t("legalHeading"),
      links: [
        { text: t("terms"), to: "/pages/terms" },
        { text: t("privacy"), to: "/pages/privacy" },
        { text: t("cookies"), to: "/pages/cookie-policy" },
        { text: t("content"), to: "/pages/content-policy" },
      ],
    },
    {
      heading: t("connectHeading"),
      links: [
        {
          text: "Instagram",
          href: "https://instagram.com/mirlo.space",
          icon: <FaInstagram aria-hidden />,
        },
        {
          text: "Mastodon",
          href: "https://musician.social/@mirlo",
          icon: <FaMastodon aria-hidden />,
        },
        {
          text: "Bluesky",
          href: "https://bsky.app/profile/mirlo.space",
          icon: <FaBluesky aria-hidden />,
        },
      ],
    },
  ];

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
            {columns.map((column) => (
              <div key={column.heading}>
                <h2 className="text-sm! font-bold! mbe-2">{column.heading}</h2>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.text}>
                      {link.to ? (
                        <Link to={link.to}>{link.text}</Link>
                      ) : (
                        <a href={link.href} title={link.text}>
                          {link.icon ? (
                            <span className="inline-flex items-center gap-2">
                              {link.icon} {link.text}
                            </span>
                          ) : (
                            link.text
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
