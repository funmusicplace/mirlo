import { css } from "@emotion/css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogInForm from "./common/LogInForm";
import WidthContainer from "components/common/WidthContainer";

function Login() {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const navigate = useNavigate();

  const afterLogIn = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

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
