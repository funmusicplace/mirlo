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
        className="flex flex-col text-left"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormComponent>
          <label htmlFor="input-email">{t("email")}</label>
          <InputEl
            autoComplete="on"
            id="input-email"
            type="email"
            {...register("email")}
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-password">{t("password")}</label>
          <InputEl
            id="input-password"
            {...register("password")}
            type="password"
          />
        </FormComponent>
        <Button isLoading={isPending} type="submit">
          {t("logIn")}
        </Button>
      </form>

      <div className="flex justify-stretch items-center my-4 w-full">
        <div className="h-px m-4 flex-auto bg-(--mi-darken-x-background-color)"></div>
        {t("or")}
        <div className="h-px m-4 flex-auto bg-(--mi-darken-x-background-color)"></div>
      </div>

      <EmailVerification
        setVerifiedEmail={afterLogIn}
        smallText={"weWillSendACodeToYourEmail"}
      />

      <p>
        <Link
          to="/password-reset"
          onClick={() => {
            afterLogIn();
          }}
        >
          {t("passwordReset")}
        </Link>
      </p>
      <p className="mbs-4">
        <Link
          to="/signup"
          onClick={() => {
            afterLogIn();
          }}
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
};

export default LogInForm;
