import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface FormData {
  jobName: string;
  jobParam: string;
}

export const Admin: React.FC = () => {
  const methods = useForm<FormData>();
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "admin" });

  const onSave = React.useCallback(
    async (data: FormData) => {
      try {
        await api.get(
          `admin/tasks?jobName=${data.jobName}&jobParam=${data.jobParam}`
        );
        snackbar("Success", { type: "success" });
      } catch (e) {
        console.error(e);
      }
    },
    [snackbar]
  );

  return (
    <form
      {...methods}
      onSubmit={methods.handleSubmit(onSave)}
      className={css`
        border: 1px solid grey;
        padding: 1rem;
      `}
    >
      <h2>{t("callServerTasks")}</h2>
      <FormComponent>
        <label>{t("whatTaskCall")}</label>
        <SelectEl {...methods.register("jobName")}>
          <option value="cleanUpFiles">cleanUpFiles</option>
        </SelectEl>
      </FormComponent>
      <FormComponent direction="row">
        <label>jobParam</label>
        <InputEl {...methods.register("jobParam")} />
      </FormComponent>
      <Button>{t("submitServerTask")}</Button>
    </form>
  );
};

export default Admin;
