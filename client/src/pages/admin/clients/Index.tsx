import { css } from "@emotion/css";
import Button from "components/common/Button";
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
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";

interface ClientForm {
  applicationName: string;
  applicationUrl: string;
  allowedCorsOrigins: string;
  userEmail: string;
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
          allowedCorsOrigins: formData.allowedCorsOrigins
            ? formData.allowedCorsOrigins.split(",").map((o) => o.trim())
            : [],
          userEmail: formData.userEmail || undefined,
        });
        reset({
          applicationName: "",
          applicationUrl: "",
          allowedCorsOrigins: "",
          userEmail: "",
        });
        snackbar(`${t("clientCreatedKeyWarning")} ${result.key}`, {
          type: "success",
        });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
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
              <th>{t("key")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.applicationName}</td>
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
                <td>{client.key ? `${client.key.slice(0, 8)}…` : ""}</td>
                <td>
                  <Button onClick={() => onRotateKey(client)}>
                    {t("rotateKey")}
                  </Button>
                  <Button onClick={() => onDelete(client)}>
                    {t("delete")}
                  </Button>
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
