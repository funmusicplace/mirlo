import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";
import { Trans, useTranslation } from "react-i18next";
import { ButtonLink } from "components/common/Button";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import { useAuthContext } from "state/AuthContext";
import { FaArrowRight } from "react-icons/fa";

export const SplashWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem;

  @media (orientation: landscape) {
    min-height: calc(100vh - 177px);
  }

  @media screen and (max-width: ${bp.medium}px) and (orientation: portrait) {
    min-height: calc(100vh - 170px);
    padding: 0rem 0.5rem 1rem 0.5rem;
  }
`;

export const TextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
  max-width: 500px;
  justify-content: center;
  padding-bottom: 1rem;
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
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <SplashWrapper>
      <div
        className={css`
          display: none;

          @media (min-width: 768px) {
            display: block;
            background-image: url("/static/images/blackbird-light.webp");
            background-size: contain;
            background-repeat: no-repeat;
            width: 370px;
            height: 285px;
            margin-right: 60px;
          }

          @media (min-width: 768px) and (prefers-color-scheme: dark) {
            background-image: url("/static/images/blackbird-dark.webp");
          }
        `}
      />
      <TextWrapper>
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: 24px;
          `}
        >
          <SplashTitle>{t("support")}</SplashTitle>
          {!user && (
            <SplashButtonWrapper>
              <ButtonLink size="big" to="/signup" rounded>
                {t("signUp")}
              </ButtonLink>
              <ButtonLink
                size="big"
                to="/login"
                variant="outlined"
                rounded
                endIcon={<FaArrowRight />}
              >
                {t("logIn")}
              </ButtonLink>
            </SplashButtonWrapper>
          )}
          <p
            className={css`
              font-size: 1rem;
              line-height: 1.5;

              br {
                margin-bottom: 1rem;
              }
            `}
          >
            <Trans
              t={t}
              i18nKey="featuresLink"
              components={{
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                features: <Link to="/pages/features"></Link>,
                about: <Link to="/pages/about"></Link>,
              }}
            />
          </p>
        </div>
      </TextWrapper>
    </SplashWrapper>
  );
};

export default Splash;
