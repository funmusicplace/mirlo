import { css } from "@emotion/css";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Table from "components/common/Table";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface FormSettings {
  trackGroupId: number;
}

const AdminFundraising = () => {
  const snackbar = useSnackbar();
  const { register, handleSubmit } = useForm<FormSettings>();

  const triggerPledgeCollection = React.useCallback(
    async (data: Partial<FormSettings>) => {
      try {
        await api.post("admin/chargePledges", {
          trackGroupId: data.trackGroupId,
        });
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
      <form onSubmit={handleSubmit(triggerPledgeCollection)}>
        <Table>
          <tr>
            <td>trackGroupId</td>
            <td>
              <InputEl
                {...register("trackGroupId")}
                className={css`
                  text-align: right;
                  background: white !important;
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

export default AdminFundraising;
