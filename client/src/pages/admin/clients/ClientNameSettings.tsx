import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { AdminClient, useUpdateAdminClientMutation } from "queries/admin";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaSave } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

const ClientNameSettings: React.FC<{ client: AdminClient }> = ({ client }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { mutateAsync: updateClient } = useUpdateAdminClientMutation();
  const [applicationName, setApplicationName] = React.useState(
    client.applicationName
  );

  const save = React.useCallback(async () => {
    try {
      await updateClient({
        clientId: client.id,
        applicationName: applicationName.trim(),
      });
    } catch (e) {
      console.error(e);
      snackbar(
        `${t("clientNameNotSaved")} ${e instanceof MirloFetchError ? e.message : ""}`,
        { type: "warning" }
      );
    }
  }, [client.id, applicationName, updateClient, snackbar, t]);

  if (client.applicationName === "frontend" && !client.clientIdUrl) {
    return <>{client.applicationName}</>;
  }

  return (
    <form
      className="flex items-center gap-2 min-w-48"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <InputEl
        aria-label={t("applicationName")}
        value={applicationName}
        onChange={(e) => setApplicationName(e.target.value)}
      />
      <Button
        type="submit"
        size="compact"
        onlyIcon
        startIcon={<FaSave />}
        disabled={
          !applicationName.trim() ||
          applicationName.trim() === client.applicationName
        }
      >
        {t("save")}
      </Button>
    </form>
  );
};

export default ClientNameSettings;
