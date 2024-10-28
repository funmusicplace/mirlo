import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import WidthContainer from "./common/WidthContainer";
import { bp } from "../constants";
import { FaInstagram, FaMastodon, FaTwitter } from "react-icons/fa";
import { FaBluesky } from "react-icons/fa6";

export const Footer = () => {
  const { t } = useTranslation("translation", { keyPrefix: "footer" });

  return (
    <div
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
          className={css`
            background-color: var(--mi-normal-background-color);
            padding: 2rem;
          `}
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
                github: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a href="https://github.com/funmusicplace/mirlo/"></a>
                ),
                // eslint-disable-next-line jsx-a11y/anchor-has-content,
                discord: <a href="https://discord.gg/VjKq26raKX"></a>,
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                email: <a href="mailto:mirlodotspace@proton.me"></a>,
              }}
            />
          </p>
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            <Trans
              t={t}
              i18nKey="aboutUs"
              components={{
                about: <Link to="/pages/about"></Link>,
                terms: <Link to="/pages/terms"></Link>,
                privacy: <Link to="/pages/privacy"></Link>,
                cookie: <Link to="/pages/cookie-policy"></Link>,
              }}
            />
          </p>
          <p
            className={css`
              a {
                margin: 0.5rem;
                font-size: 1.5rem;
              }
            `}
          >
            <a
              href="https://instagram.com/mirlo.space"
              title="Instagram"
              aria-label={`${t("socialInstagram", { username: "@mirlo.space" })}`}
            >
              <FaInstagram aria-hidden />
            </a>
            <a
              href="https://musician.social/@mirlo"
              title="Mastodon"
              aria-label={`${t("socialMastodon", { username: "@mirlo@musician.social" })}`}
            >
              <FaMastodon aria-hidden />
            </a>
            <a
              href="https://x.com/mirlospace"
              title="X"
              aria-label={`${t("socialX", { username: "@mirlospace" })}`}
            >
              <FaTwitter aria-hidden />
            </a>
            <a
              href="https://bsky.app/profile/mirlo.bsky.social"
              title="BlueSky"
              aria-label={`${t("socialBlueSky", { username: "mirlo.bsky.social" })}`}
            >
              <FaBluesky />
            </a>
          </p>
        </div>
      </WidthContainer>
    </div>
  );
};
