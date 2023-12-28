import { css } from "@emotion/css";
import Button from "./common/Button";
import { useGlobalStateContext } from "state/GlobalState";
import { useTranslation } from "react-i18next";

const CookieDisclaimer = () => {
  const { t } = useTranslation("translation", { keyPrefix: "cookies" });
  const { state, dispatch } = useGlobalStateContext();

  if (state?.cookieDisclaimerRead) {
    return null;
  }

  return (
    <div
      className={css`
        display: block;
        position: fixed;
        bottom: 1rem;
        margin: 0 auto;
        max-width: 400px;
        right: 1rem;
        left: 1rem;
        background: #333;
        color: white;
        padding: 1rem 2rem;
        z-index: 9999;

        display: flex;
        align-items: center;
        justify-content: space-between;

        button {
          margin-left: 1rem;
        }
      `}
    >
      {t("weUseCookies")}
      <Button onClick={() => dispatch({ type: "setCookieDisclaimerRead" })}>
        {t("gotIt")}
      </Button>
    </div>
  );
};

export default CookieDisclaimer;
