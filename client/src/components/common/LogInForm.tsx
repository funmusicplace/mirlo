import { useTranslation } from "react-i18next";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import Button from "./Button";
import { css } from "@emotion/css";
import { useGlobalStateContext } from "state/GlobalState";
import { useForm } from "react-hook-form";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import api from "services/api";

type SignupInputs = {
  email: string;
  password: string;
};

const LogInForm: React.FC<{ afterLogIn: () => void }> = ({ afterLogIn }) => {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const { dispatch } = useGlobalStateContext();
  const { register, handleSubmit } = useForm<SignupInputs>();
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
        afterLogIn?.();
      } catch (e: unknown) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [afterLogIn, dispatch, snackbar]
  );
  return (
    <form
      className={css`
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
  );
};

export default LogInForm;
