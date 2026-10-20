import { InputEl } from "components/common/Input";
import { AdminClient, useUpdateAdminClientMutation } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
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
        snackbar(t("invalidRedirectUris"), { type: "warning" });
      }
    },
    [client.id, updateClient, snackbar, t]
  );

  return (
    <div className="flex flex-col gap-1 min-w-64">
      <span>{t("oauthClientId", { id: client.id })}</span>
      <InputEl
        aria-label={t("redirectUris")}
        value={redirectUris}
        onChange={(e) => setRedirectUris(e.target.value)}
        onBlur={() => {
          if (redirectUris !== client.redirectUris.join(", ")) {
            save({ redirectUris: splitList(redirectUris) });
          }
        }}
      />
      <label className="flex items-center gap-2">
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
