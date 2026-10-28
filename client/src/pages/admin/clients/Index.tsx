import { css } from "@emotion/css";
import Button from "components/common/Button";
import CopyButton from "components/common/CopyButton";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { Select } from "components/common/Select";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import {
  useAdminClientsQuery,
  useCreateAdminClientMutation,
  useDeleteAdminClientMutation,
  useRotateAdminClientKeyMutation,
  useUpdateAdminClientMutation,
  AdminClient,
  AdminClientStatus,
} from "queries/admin";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt, FaSyncAlt, FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import ClientNameSettings from "./ClientNameSettings";
import ClientOAuthSettings, { splitList } from "./ClientOAuthSettings";

interface ClientForm {
  applicationName: string;
  applicationUrl: string;
  allowedCorsOrigins: string;
  userEmail: string;
  redirectUris: string;
  confidential: boolean;
}

const CLIENT_STATUSES: AdminClientStatus[] = ["pending", "approved", "revoked"];

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { register, handleSubmit, reset } = useForm<ClientForm>();

  const { data } = useAdminClientsQuery();
  const clients = data?.results ?? [];

  const { mutateAsync: createClient } = useCreateAdminClientMutation();
  const { mutateAsync: rotateKey } = useRotateAdminClientKeyMutation();
  const { mutateAsync: deleteClient } = useDeleteAdminClientMutation();
  const { mutateAsync: updateClient } = useUpdateAdminClientMutation();

  const onCreate = React.useCallback(
    async (formData: ClientForm) => {
      try {
        const { result } = await createClient({
          applicationName: formData.applicationName,
          applicationUrl: formData.applicationUrl,
          allowedCorsOrigins: splitList(formData.allowedCorsOrigins),
          userEmail: formData.userEmail || undefined,
          redirectUris: splitList(formData.redirectUris),
          confidential: formData.confidential,
        });
        reset({
          applicationName: "",
          applicationUrl: "",
          allowedCorsOrigins: "",
          userEmail: "",
          redirectUris: "",
          confidential: false,
        });
        snackbar(`${t("clientCreatedKeyWarning")} ${result.key}`, {
          type: "success",
        });
      } catch (e) {
        console.error(e);
        snackbar(
          e instanceof MirloFetchError
            ? e.message
            : "Oops something went wrong",
          { type: "warning" }
        );
      }
    },
    [createClient, reset, snackbar, t]
  );

  const onChangeStatus = React.useCallback(
    async (client: AdminClient, status: AdminClientStatus) => {
      try {
        await updateClient({ clientId: client.id, status });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [updateClient, snackbar]
  );

  const onChangeFullCatalog = React.useCallback(
    async (client: AdminClient, fullCatalog: boolean) => {
      try {
        await updateClient({ clientId: client.id, fullCatalog });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [updateClient, snackbar]
  );

  const onRotateKey = React.useCallback(
    async (client: AdminClient) => {
      try {
        const { result } = await rotateKey({ clientId: client.id });
        snackbar(`${t("clientCreatedKeyWarning")} ${result.key}`, {
          type: "success",
        });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [rotateKey, snackbar, t]
  );

  const onDelete = React.useCallback(
    async (client: AdminClient) => {
      if (!window.confirm(t("confirmDeleteClient") ?? "")) {
        return;
      }
      try {
        await deleteClient({ clientId: client.id });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [deleteClient, snackbar, t]
  );

  return (
    <WidthContainer variant="big" justify="center" className="p-4">
      <h3>{t("clients")}</h3>
      <p>{t("clientsDescription")}</p>

      <form onSubmit={handleSubmit(onCreate)}>
        <FormComponent>
          <label>{t("applicationName")}</label>
          <InputEl {...register("applicationName", { required: true })} />
        </FormComponent>
        <FormComponent>
          <label>{t("applicationUrl")}</label>
          <InputEl {...register("applicationUrl", { required: true })} />
        </FormComponent>
        <FormComponent>
          <label>{t("allowedCorsOrigins")}</label>
          <InputEl {...register("allowedCorsOrigins")} />
        </FormComponent>
        <FormComponent>
          <label>{t("clientUserEmail")}</label>
          <InputEl type="email" {...register("userEmail")} />
        </FormComponent>
        <FormComponent>
          <label>{t("redirectUris")}</label>
          <InputEl {...register("redirectUris")} />
        </FormComponent>
        <FormComponent>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("confidential")} />
            {t("confidentialClient")}
          </label>
          <small>{t("confidentialClientHint")}</small>
        </FormComponent>
        <Button type="submit">{t("createClient")}</Button>
      </form>

      {clients.length > 0 && (
        <Table
          className={css`
            margin-top: 2rem;
          `}
        >
          <thead>
            <tr>
              <th>{t("applicationName")}</th>
              <th>{t("applicationUrl")}</th>
              <th>{t("allowedCorsOrigins")}</th>
              <th>{t("clientUserEmail")}</th>
              <th>{t("clientStatus")}</th>
              <th>{t("oauth")}</th>
              <th>{t("key")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <ClientNameSettings client={client} />
                </td>
                <td>{client.applicationUrl}</td>
                <td>{client.allowedCorsOrigins.join(", ")}</td>
                <td>{client.user?.email ?? ""}</td>
                <td>
                  <Select
                    value={client.status}
                    onChange={(e) =>
                      onChangeStatus(
                        client,
                        e.target.value as AdminClientStatus
                      )
                    }
                    options={CLIENT_STATUSES.map((status) => ({
                      label: status,
                      value: status,
                    }))}
                  />
                </td>
                <td>
                  <ClientOAuthSettings client={client} />
                </td>
                <td>
                  {client.key ? `${client.key.slice(0, 8)}…` : ""}
                  {client.key && (
                    <CopyButton
                      text={client.key}
                      successMessage={t("copiedKey") ?? undefined}
                      title={t("copyKey") ?? ""}
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={client.fullCatalog}
                      onChange={(e) =>
                        onChangeFullCatalog(client, e.target.checked)
                      }
                    />
                    <a
                      href="https://docs.mirlo.space/api/canimus#which-artists-are-included"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      {t("fullCatalog")}
                      <FaExternalLinkAlt className="text-xs" />
                    </a>
                  </label>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outlined"
                      size="compact"
                      onlyIcon
                      startIcon={<FaSyncAlt />}
                      onClick={() => onRotateKey(client)}
                    >
                      {t("rotateKey")}
                    </Button>
                    <Button
                      buttonRole="warning"
                      size="compact"
                      onlyIcon
                      startIcon={<FaTrash />}
                      onClick={() => onDelete(client)}
                    >
                      {t("deleteClient")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </WidthContainer>
  );
};

export default Index;
