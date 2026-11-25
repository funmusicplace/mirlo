import { startRegistration } from "@simplewebauthn/browser";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import {
  fetchRegistrationOptions,
  SecurityKeyKind,
  useRegisterSecurityKeyMutation,
} from "queries/mfa";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaFingerprint, FaKey } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

const AddSecurityKey: React.FC<{
  onRecoveryCodes: (codes: string[]) => void;
}> = ({ onRecoveryCodes }) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminSecurity" });
  const snackbar = useSnackbar();
  const [name, setName] = React.useState("");
  const [working, setWorking] = React.useState<SecurityKeyKind>();
  const { mutateAsync: register } = useRegisterSecurityKeyMutation();

  const addKey = React.useCallback(
    async (kind: SecurityKeyKind) => {
      setWorking(kind);
      try {
        const optionsJSON = await fetchRegistrationOptions(kind);
        const response = await startRegistration({ optionsJSON });
        const { recoveryCodes } = await register({
          name: name.trim(),
          response,
        });
        setName("");
        if (recoveryCodes?.length) {
          onRecoveryCodes(recoveryCodes);
        }
      } catch {
        snackbar(t("securityKeyFailed"), { type: "warning" });
      } finally {
        setWorking(undefined);
      }
    },
    [name, register, onRecoveryCodes, snackbar, t]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addKey("securityKey");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="security-key-name" className="font-semibold">
        {t("securityKeyName")}
      </label>
      <div className="flex flex-wrap gap-2">
        <InputEl
          id="security-key-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("securityKeyNamePlaceholder")}
          maxLength={64}
          required
          className="flex-1 min-w-48"
        />
        <Button
          type="submit"
          buttonRole="primary"
          startIcon={<FaKey />}
          isLoading={working === "securityKey"}
          disabled={!!working || !name.trim()}
        >
          {t("addSecurityKey")}
        </Button>
        <Button
          type="button"
          onClick={() => addKey("passkey")}
          variant="outlined"
          startIcon={<FaFingerprint />}
          isLoading={working === "passkey"}
          disabled={!!working || !name.trim()}
        >
          {t("addPasskey")}
        </Button>
      </div>
    </form>
  );
};

export default AddSecurityKey;
