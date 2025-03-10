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

export const SplashTitle = styled.h2`
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
            data-depth="1"
            className={css`
              width: 70%;
              height: 100px;
              background-image: url("/static/images/cloud-no-grain-3.svg");

              @media screen and (max-width: ${bp.medium}px) {
                top 2rem !important;
              }
            `}
          />
          <ParallexObjectWrapper
            data-depth="2"
            className={css`
              height: 100px;
              width: 70%;
              top: 2rem !important;
              left: 30% !important;
              z-index: -1;
              background-image: url("/static/images/cloud-no-grain-2.svg");

              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0rem;
              }
            `}
          />
          <ParallexObjectWrapper
            data-depth="3"
            className={css`
              height: 140px;
              width: 70%;
              top: 80% !important;
              left: 50% !important;
              z-index: -1;
              background-image: url("/static/images/cloud-no-grain-1.svg");

              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0rem;
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
              background-image: url("/static/images/frog-mirlo-no-grain.svg");
              background-size: contain;
              background-repeat: no-repeat;
              z-index: 1;
              width: 400px;
              height: 280px;

              @media screen and (max-width: ${bp.medium}px) {
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
        </div>
      </SplashWrapper>
    </>
  );
};

export default Splash;
