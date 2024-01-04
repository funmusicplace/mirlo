import { css } from "@emotion/css";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogInForm from "./common/LogInForm";

function Login() {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const navigate = useNavigate();

  const afterLogIn = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <div
      className={css`
        padding-top: 10vh;
        text-align: center;
        margin: 0 auto;
      `}
    >
      <div
        className={css`
          max-width: 200px;
          margin: 0 auto;
        `}
      >
        <h2>{t("logIn")}</h2>
        <LogInForm afterLogIn={afterLogIn} />
      </div>
      <Link
        to="/password-reset"
        className={css`
          margin: 0 auto;
          display: inline-block;
          margin-top: 1rem;
        `}
      >
        {t("passwordReset")}
      </Link>
      <br />
      {/* <Link
        to="/signup"
        className={css`
          margin: 0 auto;
          display: inline-block;
          margin-top: 1rem;
        `}
      >
        {t("signUp")}
      </Link> */}
      <img
        alt="blackbird"
        src="/images/blackbird.png"
        className={css`
          width: 100%;
          padding: 4rem 0;
        `}
      />
    </div>
  );
}

export default Login;
