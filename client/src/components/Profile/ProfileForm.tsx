import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";

import api from "../../services/api";
import Button from "../common/Button";
import FormComponent from "../common/FormComponent";
import { InputEl } from "../common/Input";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { SelectEl } from "components/common/Select";
import { finishedLanguages } from "i18n";

function ProfileForm() {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();
  const [isSaving, setIsSaving] = React.useState(false);
  const errorHandler = useErrorHandler();
  const language = user?.language ?? navigator.language;
  const methods = useForm<{
    email: string;
    name: string;
    language: string;
  }>({
    defaultValues: {
      email: user?.email,
      name: user?.name,
      language: language.split("-")[0],
    },
  });
  const { register, handleSubmit } = methods;

  const userId = user?.id;
  const snackbar = useSnackbar();

  const doSave = React.useCallback(
    async (data: { email?: string; name: string; language: string }) => {
      if (userId) {
        try {
          const emailChanged = data.email !== user?.email;
          const confirmed = emailChanged
            ? window.confirm(
                "You will receive a confirmation email from Mirlo that you will have to act on before continuing to use Mirlo"
              )
            : true;
          if (confirmed) {
            setIsSaving(true);
            await api.put(`users/${userId}`, {
              ...data,
              client: import.meta.env.VITE_CLIENT_DOMAIN,
            });
            i18n.changeLanguage(data.language);
            snackbar(t("profileUpdated"), { type: "success" });
          }
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [snackbar, userId, user?.email, errorHandler, t]
  );

  if (!user) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(doSave)}
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <h1>{t("profile")}</h1>
        <FormComponent>
          <label>{t("email")}</label>
          <InputEl {...register("email")} disabled />
          <small
            className={css`
              margin-top: 0.5rem;
            `}
          >
            {t("changingEmailDisabled")}
          </small>
        </FormComponent>
        <FormComponent>
          <label>{t("name")}</label>
          <InputEl {...register("name")} />
        </FormComponent>
        <FormComponent>
          <label>{t("language")}</label>
          <SelectEl {...register("language")}>
            {finishedLanguages.map((lang) => (
              <option value={lang.short}>{lang.name}</option>
            ))}
          </SelectEl>
        </FormComponent>
        <Button type="submit" disabled={isSaving} isLoading={isSaving}>
          {t("updateProfileButton")}
        </Button>
      </form>
    </FormProvider>
  );
}

export default ProfileForm;
