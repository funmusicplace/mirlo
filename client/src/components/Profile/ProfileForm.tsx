import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";

import Button, { ButtonLink } from "../common/Button";
import FormComponent from "../common/FormComponent";
import { InputEl } from "../common/Input";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { SelectEl } from "components/common/Select";
import { finishedLanguages } from "i18n";
import { Toggle } from "components/common/Toggle";
import { useProfileMutation } from "queries";
import SlugInput from "components/common/SlugInput";
import { FaChevronRight } from "react-icons/fa";
import FeatureFlag from "components/common/FeatureFlag";

type FormData = {
  name: string;
  language: string;
  isLabelAccount: boolean;
  newEmail?: string;
  password?: string;
  urlSlug?: string;
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
    },
  });
  const { register, handleSubmit, watch, setValue } = methods;

  const userId = user?.id;
  const snackbar = useSnackbar();
  const { mutateAsync } = useProfileMutation();

  const isLabelAccount = watch("isLabelAccount");
  const newEmail = watch("newEmail");
  const name = watch("name");

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
        <h1>{t("profile")}</h1>
        <FormComponent>
          <label>{t("email")}</label>
          <InputEl {...register("newEmail")} />
        </FormComponent>
        {newEmail !== user.email && (
          <FormComponent>
            <label>{t("password")}</label>
            <InputEl {...register("password")} required type="password" />
          </FormComponent>
        )}
        <FormComponent>
          <label>{t("name")}</label>
          <InputEl {...register("name")} />
        </FormComponent>

        <FormComponent>
          <label>{t("language")}</label>
          <SelectEl {...register("language")}>
            {finishedLanguages.map((lang) => (
              <option key={lang.short} value={lang.short}>
                {lang.name}
              </option>
            ))}
          </SelectEl>
        </FormComponent>
        <FeatureFlag featureFlag="label">
          <FormComponent>
            <Toggle
              label={t("isLabelAccount")}
              toggled={isLabelAccount}
              onClick={() => {
                setValue("isLabelAccount", !isLabelAccount);
              }}
            />
            <small>{t("makeSearchable")}</small>
          </FormComponent>
        </FeatureFlag>
        {isLabelAccount && (
          <div
            className={css`
              display: flex;
              align-items: flex-start;

              > div {
                flex-grow: 1;
              }

              > a {
                margin-left: 1rem;
                margin-top: 0.75rem;
              }
            `}
          >
            <FormComponent>
              <SlugInput type="user" currentName={name} />
            </FormComponent>
            {user.urlSlug && (
              <ButtonLink
                to={`/label/${user.urlSlug}`}
                endIcon={<FaChevronRight />}
                variant="link"
              >
                {t("viewLabelPage")}
              </ButtonLink>
            )}
          </div>
        )}
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
      <Link
        className={css`
          margin-top: 1rem;
          display: block;
        `}
        to="/password-reset"
      >
        {t("resetPasswordLink")}
      </Link>
    </FormProvider>
  );
}

export default ProfileForm;
