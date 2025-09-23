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
import { useQueryClient } from "@tanstack/react-query";
import EmailVerification from "./EmailVerification";

type SignupInputs = {
  email: string;
  password: string;
};

const LogInForm: React.FC<{ afterLogIn: () => void }> = ({ afterLogIn }) => {
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  const { register, handleSubmit } = useForm<SignupInputs>();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();

  const { mutate: login, isPending } = useLoginMutation();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      login(data, {
        onSuccess() {
          queryClient.invalidateQueries({ queryKey: ["fetchManagedArtists"] });

          afterLogIn?.();
        },
        onError(e) {
          console.error("e", e.message);
          snackbar(e.message, { type: "warning" });
          console.error(e);
        },
      });
    },
    [login, afterLogIn, snackbar, queryClient]
  );

  return (
    <div>
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
        <Button isLoading={isPending} type="submit">
          {t("logIn")}
        </Button>
      </form>

      <span
        className={css`
          display: flex;
          justify-content: stretch;
          align-items: center;
          margin: 1rem 0;
          width: 100%;

          hr {
            flex-grow: 1;
            margin: 1rem;
            border-color: var(--mi-darken-x-background-color);
          }
        `}
      >
        <hr />
        {t("or")}
        <hr />
      </span>

      <EmailVerification
        setVerifiedEmail={afterLogIn}
        smallText={"weWillSendACodeToYourEmail"}
      />

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
    </div>
  );
};

export default LogInForm;
