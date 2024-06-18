import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { API_ROOT } from "../../constants";

import api from "../../services/api";
import Button, { ButtonLink } from "../common/Button";
import UserSupports from "./UserSupports";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import ProfileForm from "./ProfileForm";

function Profile() {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const navigate = useNavigate();

  const userId = user?.id;

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
    <div
      className={css`
        display: flex;
        flex-direction: column;
        padding: var(--mi-side-paddings-xsmall);
      `}
    >
      <WidthContainer variant="medium" justify="center">
        <ProfileForm />
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
          <ButtonLink to="/profile/collection" style={{ marginTop: "1rem" }}>
            {t("viewCollection")}
          </ButtonLink>
          <ButtonLink to="/manage" style={{ marginTop: "1rem" }}>
            {t("manageArtists")}
          </ButtonLink>
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
  );
}

export default Profile;
