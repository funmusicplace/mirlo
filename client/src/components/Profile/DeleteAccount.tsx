import Button from "components/common/Button";
import ConfirmDeleteModal from "components/common/ConfirmDeleteModal";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

import { API_ROOT } from "../../constants";

import ProfileSection from "./ProfileSection";

const DeleteAccount: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const navigate = useNavigate();
  const errorHandler = useErrorHandler();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const userId = user?.id;

  const deleteAccount = React.useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      setIsDeleting(true);
      await api.delete(`users/${userId}`);
    } catch (e) {
      errorHandler(e);
      setIsDeleting(false);
      return;
    }
    await fetch(API_ROOT + "/auth/logout", {
      method: "GET",
      credentials: "include",
    });
    refreshLoggedInUser();
    navigate("/");
  }, [userId, errorHandler, navigate, refreshLoggedInUser]);

  if (!user) {
    return null;
  }

  const hasArtists = user.artists.length > 0;

  return (
    <ProfileSection>
      <h2>{t("deleteYourAccount")}</h2>
      <Button
        style={{
          width: "100%",
          marginTop: "1rem",
        }}
        buttonRole="warning"
        onClick={() => setIsConfirming(true)}
      >
        {t("deleteAccount")}
      </Button>
      <ConfirmDeleteModal
        open={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={deleteAccount}
        title={t("deleteAccountModalTitle")}
        consequences={[
          ...(hasArtists
            ? [
                t("deleteAccountConsequenceArtists"),
                t("deleteAccountConsequenceArtistSubscribers"),
              ]
            : []),
          t("deleteAccountConsequenceCollection"),
          t("deleteAccountConsequenceSubscriptions"),
        ]}
        confirmText={user.email}
        confirmLabel={t("deleteAccount")}
        isDeleting={isDeleting}
      />
    </ProfileSection>
  );
};

export default DeleteAccount;
