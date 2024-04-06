import { useTranslation } from "react-i18next";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import Button from "./Button";
import { css } from "@emotion/css";
import { useForm } from "react-hook-form";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import { Link } from "react-router-dom";
import { useLoginMutation } from "queries/auth";

type SignupInputs = {
  email: string;
  password: string;
};

const LogInForm: React.FC<{ afterLogIn: () => void }> = ({ afterLogIn }) => {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const { register, handleSubmit } = useForm<SignupInputs>();
  const snackbar = useSnackbar();

  const { mutate: login } = useLoginMutation();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      login(data, {
        onSuccess() {
          afterLogIn?.();
        },
        onError(e) {
          snackbar(e.message, { type: "warning" });
          console.error(e);
        },
      });
    },
    [login, afterLogIn, snackbar],
  );

  return (
    <>
      <form
        className={css`
          display: flex;
          flex-direction: column;
          text-align: left;
        `}
        onSubmit={handleSubmit(onSubmit)}
      >
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
        onClick={() => {
          afterLogIn();
        }}
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
        onClick={() => {
          afterLogIn();
        }}
        className={css`
          margin: 0 auto;
          display: inline-block;
          margin-top: 1rem;
        `}
      >
        {t("signUp")}
      </Link>
    </>
  );
};

export default LogInForm;
