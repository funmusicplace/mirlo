import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import UserSupports from "./UserSupports";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import ProfileForm from "./ProfileForm";
import styled from "@emotion/styled";

export const ProfileSection = styled.div`
  border-top: 1px solid var(--mi-darken-x-background-color);
  margin-top: 2rem;
  padding-top: 1rem;
`;

function Profile() {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();

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
        <h1>{t("profile")}</h1>

        <ProfileForm />

        <ProfileSection>
          {user.artistUserSubscriptions && (
            <UserSupports
              artistUserSubscriptions={user.artistUserSubscriptions}
            />
          )}
        </ProfileSection>
      </WidthContainer>
    </div>
  );
}

export default Profile;
