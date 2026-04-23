import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { API_ROOT } from "../../constants";

import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { FormProvider, useForm } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import CanCreateArtists from "components/CanCreateArtists";
import { Toggle } from "components/common/Toggle";
import { FaChevronRight, FaEye } from "react-icons/fa";
import Button, { ButtonLink } from "components/common/Button";
import { ProfileSection } from "components/Profile";
import { useSnackbar } from "state/SnackbarContext";
import { useProfileMutation } from "queries";
import useErrorHandler from "services/useErrorHandler";
import { finishedLanguages } from "i18n";
import CurrencySelect from "components/ManageArtist/CountrySelectForm";

type FormData = {
  name: string;
  language: string;
  isLabelAccount: boolean;
  newEmail?: string;
  password?: string;
  urlSlug?: string;
  properties?: LoggedInUser["properties"];
  accountingEmail?: string;
};

const AccountContainer: React.FC = () => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  const { user, refreshLoggedInUser } = useAuthContext();
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
      accountingEmail: user?.accountingEmail,
    },
  });
  const { register, handleSubmit, watch, setValue } = methods;

  const navigate = useNavigate();

  const userId = user?.id;
  const snackbar = useSnackbar();
  const { mutateAsync } = useProfileMutation();

  const isLabelAccount = watch("isLabelAccount");
  const newEmail = watch("newEmail");

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          if (user.email !== data.newEmail && data.password === "") {
            snackbar("Must set password", { type: "warning" });
          } else {
            const isEmailChange = user.email !== data.newEmail;
            await mutateAsync({ ...data, userId });
            i18n.changeLanguage(data.language);
            snackbar(
              isEmailChange
                ? i18n.t("verificationEmailSent")
                : t("profileUpdated"),
              { type: "success" }
            );
          }
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [snackbar, userId, user?.email, errorHandler, i18n, mutateAsync, t]
  );

  const deleteAccount = React.useCallback(async () => {
    const confirmed = window.confirm(t("areYouSureDeleteAccount") ?? "");
    if (confirmed) {
      await api.delete(`users/${userId}`);
      await fetch(API_ROOT + "/auth/logout", {
        method: "GET",
        credentials: "include",
      });
      refreshLoggedInUser();
      navigate("/");
    }
  }, [t, userId, navigate, refreshLoggedInUser]);

  if (!user) {
    return null;
  }

  const userLabel = user.artists.find((a) => a.isLabelProfile);

  return (
    <WidthContainer variant="medium" justify="center" className="mt-4!">
      <h1>{t("account")}</h1>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(doSave)}
          className={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <FormComponent>
            <label>{t("email")}</label>
            <InputEl
              id="account-email"
              type="email"
              {...register("newEmail")}
            />
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
          <CanCreateArtists>
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
          </CanCreateArtists>
          {isLabelAccount && (
            <div
              className={css`
                display: flex;
                justify-content: flex-end;

                > a {
                  margin-left: 1rem;
                  margin-bottom: 1.5rem;
                }
              `}
            >
              {userLabel?.urlSlug && (
                <>
                  <ButtonLink
                    to={`/profile/label`}
                    endIcon={<FaChevronRight />}
                    variant="link"
                  >
                    {t("manageLabel")}
                  </ButtonLink>
                  <ButtonLink
                    to={`/${userLabel.urlSlug}`}
                    endIcon={<FaEye />}
                    variant="link"
                  >
                    {t("viewLabelPage")}
                  </ButtonLink>
                </>
              )}
            </div>
          )}
          <FormComponent>
            <label htmlFor="accountingEmail">{t("accountingEmail")}</label>
            <InputEl id="accountingEmail" {...register("accountingEmail")} />
          </FormComponent>
          <FormComponent
            className={css`
              display: flex;
              align-items: flex-end !important;
              justify-content: flex-end !important;
            `}
          >
            <Button type="submit" disabled={isSaving} isLoading={isSaving}>
              {t("updateAccountButton")}
            </Button>
          </FormComponent>
        </form>
        <CurrencySelect />
        <Link
          className={css`
            margin-top: 1rem;
            display: block;
          `}
          to="/password-reset"
        >
          {t("resetPasswordLink")}
        </Link>

        <CanCreateArtists>
          <ProfileSection>
            <h2>{t("manageArtists")}</h2>
            <p>{t("manageArtistsDescription")}</p>
            <ButtonLink to="/manage" style={{ marginTop: "1rem" }}>
              {t("manageArtists")}
            </ButtonLink>
          </ProfileSection>
        </CanCreateArtists>
        <ProfileSection>
          <h2>{t("deleteYourAccount")}</h2>
          <Button
            style={{
              width: "100%",
              marginTop: "1rem",
            }}
            buttonRole="warning"
            onClick={deleteAccount}
          >
            {t("deleteAccount")}
          </Button>
        </ProfileSection>
      </FormProvider>
    </WidthContainer>
  );
};

export default AccountContainer;
