import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

type SignupInputs = {
  email: string;
  password: string;
};

function PasswordReset() {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "passwordReset" });
  const location = useLocation();
  const search = new URLSearchParams(location.search);

  const token = search.get("token");
  const email = search.get("email");
  const { register: initRegister, handleSubmit: initSubmit } =
    useForm<SignupInputs>();
  const { register: newRegister, handleSubmit: newSubmit } =
    useForm<SignupInputs>();

  const snackbar = useSnackbar();

  const onInitPasswordReset = React.useCallback(
    async (data: SignupInputs) => {
      try {
        await api.post("password-reset/initiate", {
          ...data,
          redirectClient:
            process.env.REACT_APP_CLIENT_DOMAIN + "/password-reset",
        });
        snackbar("Check your email to continue resetting your password", {
          type: "success",
        });
      } catch (e: unknown) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [snackbar]
  );

  const onNewPassword = React.useCallback(
    async (data: SignupInputs) => {
      try {
        await api.post("password-reset/set-password", {
          ...data,
          token,
          email,
        });
        snackbar("Password reset! Continue to log in", {
          type: "success",
        });
        navigate("/");
      } catch (e: unknown) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [email, navigate, snackbar, token]
  );

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
      `}
    >
      {!token && (
        <form
          className={css`
            max-width: 400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            margin-top: 2rem;
          `}
          onSubmit={initSubmit(onInitPasswordReset)}
        >
          <h2>{t("title")}</h2>

          <label>{t("email")}</label>
          <InputEl type="email" {...initRegister("email")} />
          <Button type="submit">{t("reset")}</Button>
        </form>
      )}
      {token && email && (
        <form
          className={css`
            max-width: 400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
          `}
          onSubmit={newSubmit(onNewPassword)}
        >
          <h2>{t("title")}</h2>

          <label>{t("password")}</label>
          <InputEl type="password" {...newRegister("password")} />
          <Button type="submit">{t("confirmNewPassword")}</Button>
        </form>
      )}
      <img
        alt="a blackbird"
        src="/images/blackbird.png"
        className={css`
          width: 50%;
          padding: 2rem 0;
          margin: 3rem auto;
        `}
      />
    </div>
  );
}

export default PasswordReset;
