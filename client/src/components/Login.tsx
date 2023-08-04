import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import { useGlobalStateContext } from "../state/GlobalState";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import FormComponent from "./common/FormComponent";

type SignupInputs = {
  email: string;
  password: string;
};

function Login() {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });

  const { dispatch } = useGlobalStateContext();
  const { register, handleSubmit } = useForm<SignupInputs>();
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      try {
        await api.post("login", data);
        const { result } = await api.get<LoggedInUser>("profile");
        dispatch({
          type: "setLoggedInUser",
          user: result,
        });
        navigate("/");
      } catch (e: unknown) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [dispatch, navigate, snackbar]
  );

  return (
    <div
      className={css`
        text-align: center;
      `}
    >
      <form
        className={css`
          max-width: 200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          text-align: left;
        `}
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2>{t("logIn")}</h2>

        <FormComponent>
          <label>{t("email")}</label>
          <InputEl type="email" {...register("email")} />
        </FormComponent>
        <FormComponent>
          <label>{t("password")}</label>
          <InputEl {...register("password")} type="password" />
        </FormComponent>
        <Button type="submit">{t("logIn")}</Button>
      </form>
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
      <Link
        to="/signup"
        className={css`
          margin: 0 auto;
          display: inline-block;
          margin-top: 1rem;
        `}
      >
        {t("signUp")}
      </Link>

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
