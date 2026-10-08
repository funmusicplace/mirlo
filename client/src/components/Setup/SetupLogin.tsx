import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { useLoginMutation } from "queries/auth";
import React from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import SetupHeading from "./SetupHeading";
import SetupInput from "./SetupInput";

type LoginForm = {
  email: string;
  password: string;
};

const SetupLogin: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "setup" });
  const { register, handleSubmit, setFocus } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });
  const { mutate: login, isPending, isError } = useLoginMutation();

  React.useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  return (
    <form
      onSubmit={handleSubmit((data) => login(data))}
      className="w-full max-w-[30rem]"
    >
      <SetupHeading kicker={t("loginKicker")} lead={t("loginLead")} />
      <FormComponent>
        <label htmlFor="input-email">{t("loginEmail")}</label>
        <SetupInput
          id="input-email"
          type="email"
          autoComplete="username"
          required
          {...register("email", { required: true })}
        />
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-password">{t("loginPassword")}</label>
        <SetupInput
          id="input-password"
          type="password"
          autoComplete="current-password"
          required
          {...register("password", { required: true })}
        />
      </FormComponent>
      {isError && (
        <p role="alert" className="mt-2 text-(--mi-warning-color)">
          {t("loginError")}
        </p>
      )}
      <div className="mt-8 flex">
        <Button
          type="submit"
          size="big"
          uppercase
          className="ml-auto"
          isLoading={isPending}
          disabled={isPending}
        >
          {t("logIn")}
        </Button>
      </div>
      <p className="mt-8 text-sm opacity-70">
        <Trans
          t={t}
          i18nKey="loginLostPassword"
          components={{ code: <code /> }}
        />
      </p>
    </form>
  );
};

export default SetupLogin;
