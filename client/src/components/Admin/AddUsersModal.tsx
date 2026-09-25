import Button from "components/common/Button";
import EmailListInput from "components/common/EmailListInput";
import FormComponent from "components/common/FormComponent";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { isValidEmail } from "utils/email";

const ACCOUNT_TYPES = ["ARTIST", "LABEL", "LISTENER"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];
type AddMode = "invite" | "create";
type AddUsersResponse = { created: number; skipped: number };

const AddUsersModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  lockedMode?: AddMode;
}> = ({ open, onClose, onDone, lockedMode }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const [emails, setEmails] = React.useState<string[]>([]);
  const [mode, setMode] = React.useState<AddMode>(lockedMode ?? "invite");
  const [accountType, setAccountType] = React.useState<AccountType>("LISTENER");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmails([]);
      setMode(lockedMode ?? "invite");
      setAccountType("LISTENER");
    }
  }, [open, lockedMode]);

  const onSubmit = async () => {
    if (emails.length === 0) {
      snackbar(t("addUsersNoEmails"), { type: "warning" });
      return;
    }
    if (emails.some((email) => !isValidEmail(email))) {
      snackbar(t("addUsersInvalidEmails"), { type: "warning" });
      return;
    }
    const users = emails.map((email) => ({ email }));
    setIsSaving(true);
    try {
      const { created, skipped } =
        mode === "invite"
          ? await api.post<unknown, AddUsersResponse>("admin/invites", {
              users,
              inviteType: accountType,
            })
          : await api.post<unknown, AddUsersResponse>("admin/users", { users });
      const summary = t(
        mode === "invite" ? "invitationsSent" : "accountsCreated",
        { count: created }
      );
      snackbar(
        skipped > 0
          ? `${summary}. ${t("addUsersSkipped", { count: skipped })}`
          : summary,
        { type: created > 0 ? "success" : "warning" }
      );
      onDone();
      onClose();
    } catch (e) {
      snackbar(t("addUsersFailed"), { type: "warning" });
    } finally {
      setIsSaving(false);
    }
  };

  const accountTypeField = (
    <>
      <label htmlFor="input-add-users-account-type">
        {t("addUsersAccountType")}
      </label>
      <SelectEl
        id="input-add-users-account-type"
        value={accountType}
        onChange={(e) => setAccountType(e.target.value as AccountType)}
      >
        {ACCOUNT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`accountType${type}`)}
          </option>
        ))}
      </SelectEl>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lockedMode === "invite" ? t("sendInvites") : t("addUsers")}
      size="small"
    >
      <div className="flex flex-col gap-4">
        <FormComponent>
          <label htmlFor="input-add-users-emails">{t("addUsersEmails")}</label>
          <EmailListInput
            id="input-add-users-emails"
            emails={emails}
            onChange={setEmails}
            describedBy={
              lockedMode === "invite" ? "hint-add-users-emails" : undefined
            }
          />
          {lockedMode === "invite" && (
            <small id="hint-add-users-emails">{t("addUsersInviteHint")}</small>
          )}
        </FormComponent>

        {lockedMode === "invite" && (
          <FormComponent>{accountTypeField}</FormComponent>
        )}
        {lockedMode === undefined && (
          <div
            role="group"
            aria-labelledby="add-users-mode-label"
            className="flex flex-col gap-2"
          >
            <p id="add-users-mode-label" className="font-semibold">
              {t("addUsersMode")}
            </p>
            <div className="flex gap-2">
              <input
                id="input-add-users-mode-invite"
                type="radio"
                name="add-users-mode"
                value="invite"
                checked={mode === "invite"}
                onChange={() => setMode("invite")}
                aria-describedby="hint-add-users-mode-invite"
              />
              <div className="flex flex-col">
                <label htmlFor="input-add-users-mode-invite">
                  {t("addUsersInvite")}
                </label>
                <small id="hint-add-users-mode-invite">
                  {t("addUsersInviteHint")}
                </small>
              </div>
            </div>
            {mode === "invite" && (
              <FormComponent className="ml-6">{accountTypeField}</FormComponent>
            )}
            <div className="flex gap-2">
              <input
                id="input-add-users-mode-create"
                type="radio"
                name="add-users-mode"
                value="create"
                checked={mode === "create"}
                onChange={() => setMode("create")}
                aria-describedby="hint-add-users-mode-create"
              />
              <div className="flex flex-col">
                <label htmlFor="input-add-users-mode-create">
                  {t("addUsersCreate")}
                </label>
                <small id="hint-add-users-mode-create">
                  {t("addUsersCreateHint")}
                </small>
              </div>
            </div>
          </div>
        )}

        <Button onClick={onSubmit} isLoading={isSaving} disabled={isSaving}>
          {mode === "invite" ? t("sendInvitations") : t("createAccounts")}
        </Button>
      </div>
    </Modal>
  );
};

export default AddUsersModal;
