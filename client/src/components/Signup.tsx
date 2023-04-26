import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import Box from "./common/Box";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
};

function Signup() {
  const { t } = useTranslation("translation", { keyPrefix: "signUp" });
  const snackbar = useSnackbar();
  const [hasRegistered, setHasRegistered] = React.useState(false);
  const { register, handleSubmit } = useForm<SignupInputs>();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      try {
        await api.post(
          "signup",
          { ...data, client: process.env.REACT_APP_CLIENT_DOMAIN },
          {
            credentials: undefined,
          }
        );
        setHasRegistered(true);
        snackbar(t("success"), { type: "success" });
      } catch (e) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [snackbar, t]
  );

  if (hasRegistered) {
    return <Box>{t("hasRegistered")}</Box>;
  }

  return (
    <div>
      <form
        className={css`
          max-width: 200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        `}
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2>{t("register")}</h2>
        <label>{t("name")}</label>
        <InputEl type="input" {...register("name")} />
        <label>{t("email")}</label>
        <InputEl type="email" {...register("email")} />
        <label>{t("password")}</label>
        <InputEl {...register("password")} type="password" />
        <Button type="submit">{t("signUpButton")}</Button>
      </form>
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

export default Signup;
