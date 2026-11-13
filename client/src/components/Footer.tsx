import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { getFinishedLanguages, setStoredLanguage } from "i18n";
import { useProfileMutation } from "queries";
import { useInstanceSettings } from "queries/instanceSettings";
import { queryInstanceArtist } from "queries/settings";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { transformFromLinks } from "utils/links";

import { bp } from "../constants";

import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "./common/LinkIconDisplay";
import { SelectEl } from "./common/Select";
import WidthContainer from "./common/WidthContainer";

export const Footer = () => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "footer" });
  const { name, contactEmail } = useInstanceSettings();
  const { data: instanceArtist } = useQuery(queryInstanceArtist());
  const { user } = useAuthContext();
  const { mutate: saveLanguage } = useProfileMutation();

  const finishedLanguages = getFinishedLanguages();

  const onChangeLanguage = (language: string) => {
    setStoredLanguage(language);
    i18n.changeLanguage(language);
    if (user) {
      saveLanguage({ userId: user.id, language });
    }
  };

  const instanceLinks = instanceArtist
    ? transformFromLinks(instanceArtist).linkArray.map((link) => {
        const { icon } = findOutsideSite(link);
        return {
          text: linkUrlDisplay(link),
          href: linkUrlHref(link.url, true),
          icon: icon && <span aria-hidden>{icon}</span>,
        };
      })
    : [];

  const columns: {
    heading: string;
    links: { text: string; to?: string; href?: string; icon?: JSX.Element }[];
  }[] = [
    {
      heading: name,
      links: [
        ...(contactEmail
          ? [{ text: t("contact"), href: `mailto:${contactEmail}` }]
          : []),
        ...instanceLinks,
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
  ].filter((column) => column.links.length > 0);

  return (
    <footer
      className={css`
        text-align: left;
        display: block;
        margin: 5rem auto 0;
        padding: var(--mi-side-paddings-normal);
        max-width: var(--mi-container-big);
        z-index: 2;
        width: 100%;

        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          margin-top: 3rem;
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
          <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-8 mbe-8">
            {columns.map((column) => (
              <div key={column.heading}>
                <h2 className="text-sm! font-bold! mbe-2">{column.heading}</h2>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.to ?? link.href}>
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
          <p className="text-xs md:text-center">
            <Trans
              t={t}
              i18nKey="poweredByMirlo"
              components={{
                mirlo: <a href="https://docs.mirlo.space"></a>,
                github: <a href="https://github.com/funmusicplace/mirlo/"></a>,
                discord: <a href="https://discord.gg/VjKq26raKX"></a>,
              }}
            />
          </p>
        </div>
      </WidthContainer>
    </footer>
  );
};
