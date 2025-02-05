import Button from "components/common/Button";
import TextEditor from "components/common/TextEditor";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

interface FormData {
  content: string;
}

const AdminSendEmail = () => {
  const { ask } = useConfirm();

  const snackbar = useSnackbar();
  const methods = useForm<FormData>();

  const updateSettings = React.useCallback(
    async (data: FormData) => {
      try {
        const ok = await ask(
          "Are you sure you want to send this to these users? With great power comes great responsibility."
        );
        if (!ok) {
          return;
        }
        const { result } = await api.post<
          { content: string },
          { result: { sentTo: number } }
        >("admin/send-email", data);
        snackbar(`Sent email to ${result.sentTo} users!`, { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [snackbar]
  );

  return (
    <WidthContainer variant="medium">
      <h3>Send Email</h3>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(updateSettings)}>
          <Controller
            name="content"
            render={({ field: { onChange, value } }) => {
              return (
                <TextEditor
                  onChange={(val: any) => {
                    onChange(val);
                  }}
                  value={value}
                />
              );
            }}
          />
          <Button type="submit">Send email</Button>
        </form>
      </FormProvider>
    </WidthContainer>
  );
};

export default AdminSendEmail;
