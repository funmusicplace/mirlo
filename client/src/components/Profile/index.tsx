import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { API_ROOT } from "../../constants";

import api from "../../services/api";
import { useGlobalStateContext } from "../../state/GlobalState";
import Button from "../common/Button";
import FormComponent from "../common/FormComponent";
import { InputEl } from "../common/Input";
import UserSupports from "./UserSupports";
import useErrorHandler from "services/useErrorHandler";

function Profile() {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const {
    state: { user },
    dispatch,
  } = useGlobalStateContext();
  const [isSaving, setIsSaving] = React.useState(false);
  const errorHandler = useErrorHandler();
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<{
    email: string;
    name: string;
  }>({
    defaultValues: {
      email: user?.email,
      name: user?.name,
    },
  });

  const fetchProfile = React.useCallback(async () => {
    const { result } = await api.get<LoggedInUser>("profile");
    dispatch({
      type: "setLoggedInUser",
      user: result,
    });
  }, [dispatch]);

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
      dispatch({
        type: "setLoggedInUser",
        user: undefined,
      });
      navigate("/");
    }
  }, [t, userId, navigate, dispatch]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) {
    return null;
  }

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
      `}
    >
      <form
        onSubmit={handleSubmit(doSave)}
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <h2>{t("profile")}</h2>
        <FormComponent>
          {t("email")}
          <InputEl {...register("email")} disabled />
          <small>{t("changingEmailDisabled")}</small>
        </FormComponent>
        <FormComponent>
          {t("name")}
          <InputEl {...register("name")} />
        </FormComponent>
        <Button type="submit" disabled={isSaving} isLoading={isSaving}>
          {t("updateProfileButton")}
        </Button>
      </form>
      {user.artistUserSubscriptions && (
        <UserSupports artistUserSubscriptions={user.artistUserSubscriptions} />
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
  );
}

export default Profile;
