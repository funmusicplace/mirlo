import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";
import Box from "./common/Box";
import { Link } from "react-router-dom";
import FormComponent from "./common/FormComponent";
import Checkbox from "./common/FormCheckbox";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
  receiveMailingList: boolean;
};

function Signup() {
  const { t } = useTranslation("translation", { keyPrefix: "signUp" });
  const snackbar = useSnackbar();
  const [hasRegistered, setHasRegistered] = React.useState(false);
  const methods = useForm<SignupInputs>();
  const { register, handleSubmit } = methods;

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
    <FormProvider {...methods}>
      <div
        className={css`
          text-align: center;
        `}
      >
        <form
          className={css`
            max-width: 230px;
            margin: 0 auto;
            display: flex;
            text-align: left;
            flex-direction: column;
          `}
          onSubmit={handleSubmit(onSubmit)}
        >
          <h2>{t("register")}</h2>
          <FormComponent>
            <label>{t("name")}</label>
            <InputEl type="input" {...register("name")} />
          </FormComponent>
          <FormComponent>
            <label>{t("email")}</label>
            <InputEl type="email" {...register("email")} />
          </FormComponent>
          <FormComponent>
            <label>{t("password")}</label>
            <InputEl {...register("password")} type="password" />
          </FormComponent>
          <FormComponent>
            <Checkbox
              keyName="receiveMailingList"
              description={t("receiveMailingList")}
            />
          </FormComponent>
          <Button type="submit">{t("signUpButton")}</Button>
        </form>
        <Link
          to="/login"
          className={css`
            margin: 0 auto;
            display: inline-block;
            margin-top: 1rem;
          `}
        >
          {t("logIn")}
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
    </FormProvider>
  );
}

export default Signup;
