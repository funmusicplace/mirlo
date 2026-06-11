import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import LogInForm from "./common/LogInForm";

function Login() {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const afterLogIn = React.useCallback(() => {
    // Only allow relative redirects to avoid sending users off-site.
    const redirect = searchParams.get("redirect");
    navigate(redirect && redirect.startsWith("/") ? redirect : "/");
  }, [navigate, searchParams]);

  return (
    <WidthContainer variant="small">
      <div
        className={css`
          padding-top: 10vh;
          margin: 0 auto;
        `}
      >
        <h1>{t("logIn")}</h1>
        <LogInForm afterLogIn={afterLogIn} />
      </div>

      <br />

      <img
        alt=""
        src="/static/images/blackbird.png"
        className={css`
          width: 100%;
          padding: 4rem 0;
        `}
      />
    </WidthContainer>
  );
}

export default Login;
