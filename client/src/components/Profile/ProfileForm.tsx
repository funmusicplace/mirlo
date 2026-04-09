import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

import Button from "../common/Button";
import FormComponent from "../common/FormComponent";
import { InputEl } from "../common/Input";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

import { useProfileMutation } from "queries";

type FormData = {
  name: string;
  language: string;
  isLabelAccount: boolean;
  newEmail?: string;
  password?: string;
  urlSlug?: string;
  properties?: LoggedInUser["properties"];
};

function ProfileForm() {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();
  const [isSaving, setIsSaving] = React.useState(false);
  const errorHandler = useErrorHandler();
  const language = user?.language ?? navigator.language;
  const methods = useForm<FormData>({
    defaultValues: {
      newEmail: user?.email,
      name: user?.name,
      language: language.split("-")[0],
      isLabelAccount: user?.isLabelAccount,
      urlSlug: user?.urlSlug,
      properties: user?.properties || {},
    },
  });
  const { register, handleSubmit } = methods;

  const userId = user?.id;
  const snackbar = useSnackbar();
  const { mutateAsync } = useProfileMutation();

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          if (user.email !== data.newEmail && data.password === "") {
            snackbar("Must set password", { type: "warning" });
          } else {
            await mutateAsync({ ...data, userId });
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
        <FormComponent>
          <label>{t("name")}</label>
          <InputEl {...register("name")} />
        </FormComponent>

        <FormComponent
          className={css`
            display: flex;
            align-items: flex-end !important;
            justify-content: flex-end !important;
          `}
        >
          <Button type="submit" disabled={isSaving} isLoading={isSaving}>
            {t("updateProfileButton")}
          </Button>
        </FormComponent>
      </form>
      {/* <ProfileSection>
        <ProfileImages />
      </ProfileSection> */}
    </FormProvider>
  );
}

export default ProfileForm;
