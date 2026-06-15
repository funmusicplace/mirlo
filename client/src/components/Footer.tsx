import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { FaInstagram, FaMastodon } from "react-icons/fa";
import { FaBluesky } from "react-icons/fa6";
import { Link } from "react-router-dom";

import { bp } from "../constants";

import WidthContainer from "./common/WidthContainer";

export const Footer = () => {
  const { t } = useTranslation("translation", { keyPrefix: "footer" });

  return (
    <footer
      className={css`
        text-align: center;
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
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
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
          <ul className="flex gap-4 justify-center flex-wrap mbe-4">
            <li>
              <a href="https://docs.mirlo.space">{t("about")}</a>
            </li>
            <li>
              <a href="https://docs.mirlo.space">{t("documentation")}</a>
            </li>
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
            <li>
              <a href="mailto:hi@mirlo.space">{t("contact")}</a>
            </li>
          </ul>
          <ul className="flex justify-center gap-4 pb-1">
            <li>
              <a
                href="https://instagram.com/mirlo.space"
                title="Instagram"
                className="text-2xl"
                aria-label="Instagram"
              >
                <FaInstagram aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="https://musician.social/@mirlo"
                title="Mastodon"
                className="text-2xl"
                aria-label="Mastodon"
              >
                <FaMastodon aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="https://bsky.app/profile/mirlo.space"
                title="Bluesky"
                className="text-2xl"
                aria-label="Bluesky"
              >
                <FaBluesky aria-hidden />
              </a>
            </li>
          </ul>
        </div>
      </WidthContainer>
    </footer>
  );
};
