import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { AdminClient, useUpdateAdminClientMutation } from "queries/admin";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaSave } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

export const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const ClientOAuthSettings: React.FC<{ client: AdminClient }> = ({ client }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { mutateAsync: updateClient } = useUpdateAdminClientMutation();
  const [redirectUris, setRedirectUris] = React.useState(
    client.redirectUris.join(", ")
  );

  const save = React.useCallback(
    async (data: { redirectUris?: string[]; confidential?: boolean }) => {
      try {
        await updateClient({ clientId: client.id, ...data });
      } catch (e) {
        console.error(e);
        snackbar(
          `${t("oauthSettingsNotSaved")} ${e instanceof MirloFetchError ? e.message : ""}`,
          { type: "warning" }
        );
      }
    },
    [client.id, updateClient, snackbar, t]
  );

  if (client.clientIdUrl) {
    return (
      <div className="flex flex-col gap-1 min-w-64">
        <span>{t("metadataDocument")}</span>
        <a href={client.clientIdUrl} target="_blank" rel="noreferrer">
          {client.clientIdUrl}
        </a>
        <span>{client.redirectUris.join(", ")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-64">
      <span>{t("oauthClientId", { id: client.id })}</span>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save({ redirectUris: splitList(redirectUris) });
        }}
      >
        <InputEl
          aria-label={t("redirectUris")}
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
        />
        <Button
          type="submit"
          size="compact"
          onlyIcon
          startIcon={<FaSave />}
          disabled={redirectUris === client.redirectUris.join(", ")}
        >
          {t("save")}
        </Button>
      </form>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={client.confidential}
          onChange={(e) => save({ confidential: e.target.checked })}
        />
        {t("confidentialClient")}
      </label>
    </div>
  );
};

export default ClientOAuthSettings;
