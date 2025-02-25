import { css } from "@emotion/css";
import { SplashButtonWrapper, SplashWrapper } from "./Splash";
import { ButtonLink } from "components/common/Button";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

const Kickstarter = () => {
  const { t } = useTranslation("translation", { keyPrefix: "kickstarter" });

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
          margin: 0;
          display: flex;
          min-height: auto !important;
          padding: 1rem !important;
          flex-direction: row;
          align-items: center;
          gap: 2rem;

          @media screen and (max-width: ${bp.medium}px) {
            margin: 0;
            gap: 1rem;
            padding: 0.5rem !important;
          }
        `}
      >
        <h2
          className={css`
            margin-bottom: 0;

            @media screen and (max-width: ${bp.medium}px) {
              font-size: var(--mi-font-size-small) !important;
              line-height: 1.2rem !important;
            }
          `}
        >
          {t("helpKeepMirloRunning")}
        </h2>
        <SplashButtonWrapper>
          <ButtonLink
            to="/team/support"
            size="big"
            rounded
            className={css`
              display: block;
              padding: 1rem;
              text-decoration: none;
              text-align: center;
              &:hover {
                text-decoration: underline;
              }

              color: var(--mi-white) !important;
              background-color: var(--mi-black) !important;
              @media (prefers-color-scheme: dark) {
                background-color: var(--mi-white) !important;
                color: var(--mi-black) !important;
              }

              @media screen and (max-width: ${bp.medium}px) {
                font-size: var(--mi-font-size-xsmall) !important;
              }
            `}
          >
            {t("donateNow")}
          </ButtonLink>
        </SplashButtonWrapper>
      </SplashWrapper>
    </div>
  );
};

export default Kickstarter;
