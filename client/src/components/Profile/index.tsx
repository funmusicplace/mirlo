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
import styled from "@emotion/styled";

const ProfileSection = styled.div`
  border-top: 1px solid var(--mi-darken-x-background-color);
  margin-top: 2rem;
  padding-top: 1rem;
`;

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
          <ProfileSection>
            {user.artistUserSubscriptions && (
              <UserSupports
                artistUserSubscriptions={user.artistUserSubscriptions}
              />
            )}
          </ProfileSection>
          <ProfileSection>
            <ButtonLink to="/manage" style={{ marginTop: "1rem" }}>
              {t("manageArtists")}
            </ButtonLink>
          </ProfileSection>
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
        </div>
      </WidthContainer>
    </div>
  );
}

export default Profile;
