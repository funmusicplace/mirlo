import { css } from "@emotion/css";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Table from "components/common/Table";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface Settings {
  platformPercent: number;
}

const AdminSettings = () => {
  const snackbar = useSnackbar();
  const { reset, register, handleSubmit } = useForm();

  React.useEffect(() => {
    const callback = async () => {
      const response = await api.get<Partial<Settings>>("admin/settings/");
      reset(response.result);
    };
    callback();
  }, [reset]);

  const updateSettings = React.useCallback(
    async (data: Partial<Settings>) => {
      try {
        await api.post("admin/settings", data);
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [snackbar]
  );

  return (
    <div>
      <h3>Settings</h3>
      <form onSubmit={handleSubmit(updateSettings)}>
        <Table>
          <tr>
            <td>Platform percent</td>
            <td>
              <InputEl
                {...register("platformPercent")}
                type="number"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
        </Table>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
};

export default AdminSettings;
