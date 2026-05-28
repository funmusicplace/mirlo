import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { useGlobalStateContext } from "state/GlobalState";

import Button from "./common/Button";

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
        padding: 1rem 1rem;
        z-index: 9999;

        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      `}
      data-nosnippet
    >
      {t("weUseCookies")}
      <Button
        className="shrink-0"
        onClick={() => dispatch({ type: "setCookieDisclaimerRead" })}
      >
        {t("gotIt")}
      </Button>
    </div>
  );
};

export default CookieDisclaimer;
