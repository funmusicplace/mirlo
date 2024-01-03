import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";
import { Trans, useTranslation } from "react-i18next";

const Splash = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: var(--mi-side-paddings-xsmall);
      `}
    >
      <div
        className={css`
          display: none;

          @media (min-width: 768px) {
            display: block;
            background-image: url("/images/blackbird-light.webp");
            background-size: contain;
            background-repeat: no-repeat;
            width: 370px;
            height: 285px;
            margin-right: 60px;
          }

          @media (min-width: 768px) and (prefers-color-scheme: dark) {
            background-image: url("/images/blackbird-dark.webp");
          }
        `}
      />
      <div
        className={css`
          padding-top: 5vh;
          display: flex;
          flex-direction: column;
          gap: 48px;
          max-width: 500px;
        `}
      >
        <Logo />
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: 24px;
          `}
        >
          <h1
            className={css`
              font-size: 1.75rem;
              font-weight: 400;
              line-height: 1.25;
            `}
          >
            {t("support")}
          </h1>
          <div
            className={css`
              display: flex;
              gap: 16px;
            `}
          >
            <Link
              to="/signup"
              className={css`
                display: block;
                height: 51px;
                border-radius: 9999px;
                font-weight: bold;
                font-size: 1rem;
                align-items: center;
                display: inline-flex;
                line-height: 1rem;
                padding: 1rem;
                text-decoration: none;
                text-align: center;

                &:hover {
                  text-decoration: underline;
                }

                background-color: #be3455;
                color: var(--mi-white);
              `}
            >
              {t("signUp")}
            </Link>
            <Link
              to="/login"
              className={css`
                display: block;
                height: 51px;
                border-radius: 9999px;
                font-weight: bold;
                font-size: 1rem;
                align-items: center;
                display: inline-flex;
                line-height: 1rem;
                padding: 1rem;
                text-decoration: none;
                text-align: center;
                &:hover {
                  text-decoration: underline;
                }

                background-color: var(--mi-black);
                color: var(--mi-white);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--mi-white);
                  color: var(--mi-black);
                }
              `}
            >
              {t("logIn")}
            </Link>
          </div>
          <p
            className={css`
              font-size: 0.875rem;
              line-height: 1.5;
            `}
          >
            <Trans
              t={t}
              i18nKey="mirloConstruction"
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                about: <a href="/pages/about"></a>,
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                faq: <a href="/pages/faq"></a>,
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
        </div>
      </div>
    </div>
  );
};

export default Splash;
