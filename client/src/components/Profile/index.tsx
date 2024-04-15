import { css } from "@emotion/css";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { API_ROOT } from "../../constants";

import api from "../../services/api";
import Button from "../common/Button";
import FormComponent from "../common/FormComponent";
import { InputEl } from "../common/Input";
import UserSupports from "./UserSupports";
import useErrorHandler from "services/useErrorHandler";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

function Profile() {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const [isSaving, setIsSaving] = React.useState(false);
  const errorHandler = useErrorHandler();
  const navigate = useNavigate();
  const methods = useForm<{
    email: string;
    name: string;
  }>({
    defaultValues: {
      email: user?.email,
      name: user?.name,
    },
  });
  const { register, handleSubmit } = methods;

  const userId = user?.id;
  const snackbar = useSnackbar();

  const doSave = React.useCallback(
    async (data: { email?: string; name: string }) => {
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
              client: process.env.REACT_APP_CLIENT_DOMAIN,
            });
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

  return (
    <FormProvider {...methods}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        <WidthContainer variant="medium" justify="center">
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
            <Button type="submit" disabled={isSaving} isLoading={isSaving}>
              {t("updateProfileButton")}
            </Button>
          </form>
          <div
            className={css`
              button {
                margin-top: 0.5rem;
              }
            `}
          >
            {user.artistUserSubscriptions && (
              <UserSupports
                artistUserSubscriptions={user.artistUserSubscriptions}
              />
            )}
            <Link to="/profile/collection" style={{ marginTop: "1rem" }}>
              <Button style={{ width: "100%" }}>{t("viewCollection")}</Button>
            </Link>
            <Link to="/manage" style={{ marginTop: "1rem" }}>
              <Button style={{ width: "100%" }}>{t("manageArtists")}</Button>
            </Link>
            <Button
              style={{
                width: "100%",
                backgroundColor: "var(--mi-warning-background-color)",
                borderColor: "var(--mi-darken-warning-background-color)",
                marginTop: "1rem",
              }}
              onClick={deleteAccount}
            >
              {t("deleteAccount")}
            </Button>
          </div>
        </WidthContainer>
      </div>
    </FormProvider>
  );
}

export default Profile;
