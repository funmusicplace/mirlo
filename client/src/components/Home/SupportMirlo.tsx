import { css } from "@emotion/css";
import {
  SplashButtonWrapper,
  SplashTitle,
  SplashWrapper,
  TextWrapper,
} from "./Splash";
import Button from "components/common/Button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SupportMirlo = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <SplashWrapper
      className={css`
        margin: 4rem;
      `}
    >
      <TextWrapper>
        <div
          className={css`
            display: flex;
            flex-direction: column;
            gap: 24px;
          `}
        >
          <SplashTitle>{t("sustainedBy")}</SplashTitle>
          <SplashButtonWrapper>
            <Link to="/team/support">
              <Button
                variant="big"
                className={css`
                  background-color: #be3455 !important;
                  color: var(--mi-white) !important;
                `}
              >
                {t("supportTeam")}
              </Button>
            </Link>
          </SplashButtonWrapper>
        </div>
      </TextWrapper>
      <div
        className={css`
          display: none;

          @media (min-width: 768px) {
            display: block;
            background-image: url("/images/flock.svg");
            background-size: contain;
            background-repeat: no-repeat;
            width: 370px;
            height: 285px;
            margin-right: 60px;
          }

          @media (min-width: 768px) and (prefers-color-scheme: dark) {
            background-image: url("/images/flock.svg");
          }
        `}
      />
    </SplashWrapper>
  );
};

export default SupportMirlo;
