import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";
import { Trans, useTranslation } from "react-i18next";
import Button from "components/common/Button";
import styled from "@emotion/styled";

export const SplashWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem;
`;

export const TextWrapper = styled.div`
  padding-top: 5vh;
  display: flex;
  flex-direction: column;
  gap: 48px;
  max-width: 500px;
  margin-bottom: 5vh;
`;

export const SplashTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.25;
`;

export const SplashButtonWrapper = styled.div`
  display: flex;
  gap: 16px;
`;

const Splash = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <SplashWrapper>
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
      <TextWrapper>
        <Logo />
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: 24px;
          `}
        >
          <SplashTitle>{t("support")}</SplashTitle>
          <SplashButtonWrapper>
            <Link to="/signup">
              <Button
                variant="big"
                className={css`
                  background-color: #be3455 !important;
                  color: var(--mi-white) !important;
                `}
              >
                {t("signUp")}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="big"
                className={css`
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--mi-white);
                    color: var(--mi-black);
                  }
                `}
              >
                {t("logIn")}
              </Button>
            </Link>
          </SplashButtonWrapper>
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
      </TextWrapper>
    </SplashWrapper>
  );
};

export default Splash;
