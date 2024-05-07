import { css } from "@emotion/css";
import { SplashButtonWrapper, SplashTitle, SplashWrapper } from "./Splash";
import { ButtonAnchor, ButtonLink } from "components/common/Button";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { useGlobalStateContext } from "state/GlobalState";

const Kickstarter = () => {
  const { t } = useTranslation("translation", { keyPrefix: "kickstarter" });

  const { state, dispatch } = useGlobalStateContext();

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
          flex-direction: row;
          align-items: center;
          gap: 2rem;

          @media screen and (max-width: ${bp.medium}px) {
            margin: 0;
            flex-direction: column;
          }
        `}
      >
        <h2
          className={css`
            margin-bottom: 0;
          `}
        >
          {t("launchedAKickstarter")}
        </h2>
        <SplashButtonWrapper>
          <ButtonAnchor
            href="https://www.kickstarter.com/projects/mirlo/mirlo"
            variant="big"
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
            `}
          >
            {t("helpUsReachOurGoal")}
          </ButtonAnchor>
        </SplashButtonWrapper>
      </SplashWrapper>
    </div>
  );
};

export default Kickstarter;
