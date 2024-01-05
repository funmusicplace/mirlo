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
import { bp } from "../../constants";

const SupportMirlo = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  return (
    <div
      className={css`
        width: 100%;
        background-color: #be3455;
        color: var(--mi-white);

        @media screen and (max-width: ${bp.medium}px) {
          margin: 0;
        }

        @media (min-width: 768px) and (prefers-color-scheme: dark) {
          background-color: var(--mi-secondary-color);
        }
      `}
    >
      <SplashWrapper
        className={css`
          margin: 4rem 0;
          display: flex;
          min-height: auto !important;

          @media screen and (max-width: ${bp.medium}px) {
            margin: 0;
            min-height: calc(100vh - 60px) !important;
            flex-direction: column-reverse;
          }
        `}
      >
        <TextWrapper
          className={css`
            @media screen and (max-width: ${bp.medium}px) {
              padding-top: 0;
            }

            @media screen and (max-width: ${bp.small}px) {
              padding: var(--mi-side-paddings-normal);
            }
          `}
        >
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
                    display: block;
                    height: 51px !important;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 1rem;
                    color: var(--mi-white) !important;
                    align-items: center;
                    display: inline-flex;
                    line-height: 1rem;
                    padding: 1rem;
                    text-decoration: none;
                    text-align: center;
                    &:hover {
                      text-decoration: underline;
                    }

                    background-color: var(--mi-black) !important;
                    color: var(--mi-white);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--mi-white) !important;
                      color: var(--mi-black) !important;
                    }
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
            display: block;
            background-image: url("/images/flock.svg");
            background-size: contain;
            background-repeat: no-repeat;
            width: 90%;
            height: 30vh;

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
    </div>
  );
};

export default SupportMirlo;
