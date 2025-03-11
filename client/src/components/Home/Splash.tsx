import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ButtonLink } from "components/common/Button";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import { useAuthContext } from "state/AuthContext";
import { FaArrowRight } from "react-icons/fa";
import React from "react";
import Parallax from "parallax-js";

export const SplashWrapper = styled.div`
  display: flex;
  align-items: center;
  display: relative;
  justify-content: center;
  width: 100%;
  overflow: hidden;
  position: relative;
  background-image: url("/static/images/grain-small.png");

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

export const SplashTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.25;
`;

export const SplashButtonWrapper = styled.div`
  display: flex;
  gap: 16px;
`;

const ParallexObjectWrapper = styled.div`
  background-size: contain;
  background-repeat: no-repeat;
`;

const Splash = () => {
  const sceneEl = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (sceneEl.current) {
      const parallaxInstance = new Parallax(sceneEl.current, {
        relativeInput: true,
        hoverOnly: true,
      });

      parallaxInstance.enable();

      return () => parallaxInstance.disable();
    }
  }, []);

  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <>
      <SplashWrapper>
        <div
          className={css`
            width: 100%;
            position: absolute !important;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 0;
          `}
          ref={sceneEl}
        >
          <ParallexObjectWrapper
            data-depth=".2"
            className={css`
              width: 60%;
              height: 50px;
              top: -30% !important;
              left: 0rem !important;
              background-image: url("/static/images/cloud-no-grain-3.svg");
              z-index: 1;

              @media screen and (max-width: ${bp.medium}px) {
                top: -40% !important;
              }
            `}
          />
          <ParallexObjectWrapper
            data-depth=".4"
            className={css`
              height: 80px;
              width: 70%;
              top: 75% !important;
              left: 10% !important;
              z-index: -1;
              background-image: url("/static/images/cloud-no-grain-2.svg");

              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0rem;
                top: 38% !important;
              }
            `}
          />
          <ParallexObjectWrapper
            data-depth=".6"
            className={css`
              height: 140px;
              width: 60%;
              top: 55% !important;
              left: 35% !important;
              z-index: -1;
              background-image: url("/static/images/cloud-no-grain-1.svg");

              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0rem;
                top: 42% !important;
              }
            `}
          ></ParallexObjectWrapper>
        </div>
        <div
          className={css`
            display: flex !important;
            width: 100%;
            height: 100%;
            justify-content: center;
            align-items: center;
            z-index: 1;
            @media screen and (max-width: ${bp.medium}px) {
              flex-direction: column;
            }
          `}
        >
          <div
            className={css`
              background-image: url("/static/images/frog-mirlo-toneddowngrain.webp");
              background-size: contain;
              background-repeat: no-repeat;
              z-index: 1;
              width: 540px;
              height: 370px;
              margin-right: 4rem;

              @media screen and (max-width: ${bp.medium}px) {
                margin-right: 0;
                margin-top: 4rem;
                width: 300px;
              }
            `}
          />

          <TextWrapper>
            <div
              className={css`
                display: flex;
                flex-direction: column;
                gap: 24px;

                color: var(--mi-black);
              `}
            >
              <SplashTitle>
                <Trans
                  t={t}
                  i18nKey="support"
                  components={{
                    red: (
                      <span
                        className={css`
                          color: var(--mi-pink);
                        `}
                      ></span>
                    ),
                  }}
                ></Trans>
              </SplashTitle>
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
        </div>
      </SplashWrapper>
    </>
  );
};

export default Splash;
