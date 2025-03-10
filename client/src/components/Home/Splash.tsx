import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ButtonLink } from "components/common/Button";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import { useAuthContext } from "state/AuthContext";
import { FaArrowRight } from "react-icons/fa";

export const SplashWrapper = styled.div`
  display: flex;
  align-items: center;
  display: relative;
  justify-content: center;
  width: 100%;
  padding: 2rem;
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
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  background-size: contain;
  background-repeat: no-repeat;
`;

const Splash = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <>
      <SplashWrapper>
        <div
          className={css`
            height: 100vh;
            width: 100%;
            overflow-x: hidden;

            perspective: 1px;
          `}
        >
          <ParallexObjectWrapper
            className={css`
              display: flex;
              justify-content: center;
              align-items: center;
            `}
          >
            <div
              className={css`
                background-image: url("/static/images/frog-mirlo-no-grain.svg");
                width: 370px;
                height: 285px;

                background-size: contain;
                background-repeat: no-repeat;
                z-index: 1;
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
          </ParallexObjectWrapper>
          <ParallexObjectWrapper
            className={css`
              transform: translateZ(0);

              width: 100%;
              height: 100rem;
            `}
          />
          <ParallexObjectWrapper
            className={css`
              transform: translateZ(-1px);

              top: 10rem;

              width: 100%;
              height: 200px;

              background-image: url("/static/images/cloud-no-grain-2.svg");
            `}
          />
          <ParallexObjectWrapper
            className={css`
              transform: translateZ(-2px);

              top: 20rem;

              height: 200px;

              background-image: url("/static/images/cloud-no-grain-1.svg");
            `}
          />
          <ParallexObjectWrapper
            className={css`
              transform: translateZ(-3px);

              top: 20rem;

              height: 200px;

              background-image: url("/static/images/cloud-no-grain-3.svg");
            `}
          ></ParallexObjectWrapper>
        </div>
      </SplashWrapper>
    </>
  );
};

export default Splash;
