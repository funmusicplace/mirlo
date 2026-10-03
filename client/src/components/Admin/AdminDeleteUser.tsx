import Button from "components/common/Button";
import ConfirmDeleteModal from "components/common/ConfirmDeleteModal";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

const AdminDeleteUser: React.FC<{ user: UserFromAdmin }> = ({ user }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const errorHandler = useErrorHandler();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const onDelete = React.useCallback(async () => {
    try {
      setIsDeleting(true);
      await api.delete(`admin/users/${user.id}`);
      snackbar(t("userDeleteSuccess", { email: user.email }), {
        type: "success",
      });
      navigate("/admin/content/users");
    } catch (e) {
      errorHandler(e);
      setIsDeleting(false);
    }
  }, [user.id, user.email, t, snackbar, navigate, errorHandler]);

  return (
    <section className="mt-8 flex flex-col items-start gap-2">
      <h3>{t("deleteUser")}</h3>
      <small>{t("deleteUserDescription")}</small>
      <Button
        buttonRole="warning"
        startIcon={<FaTrash />}
        onClick={() => setIsConfirming(true)}
      >
        {t("deleteUser")}
      </Button>
      <ConfirmDeleteModal
        open={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={onDelete}
        title={t("deleteUserModalTitle", { email: user.email })}
        consequences={[
          t("deleteUserConsequenceArtists"),
          t("deleteUserConsequenceArtistSubscribers"),
          t("deleteUserConsequenceCollection"),
          t("deleteUserConsequenceSubscriptions"),
        ]}
        confirmText={user.email}
        confirmLabel={t("deleteUser")}
        isDeleting={isDeleting}
      />
    </section>
  );
};

export default AdminDeleteUser;
