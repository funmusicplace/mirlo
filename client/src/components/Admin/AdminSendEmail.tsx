import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import TextEditor from "components/common/TextEditor";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useConfirm } from "utils/useConfirm";

interface FormData {
  content: string;
  title: string;
  sendToOption: "emails" | "allArtists";
  sendTo: string;
}

const AdminSendEmail = () => {
  const { ask } = useConfirm();

  const snackbar = useSnackbar();
  const methods = useForm<FormData>();
  const { register, watch } = methods;

  const sendToOption = watch("sendToOption");

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
          FormData,
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
        <FormComponent>
          <label>Send to</label>
          <SelectEl {...register("sendToOption")}>
            <option value="emails">Individual Emails</option>
            <option value="allArtists">All artists</option>
          </SelectEl>
        </FormComponent>
        {sendToOption === "emails" && (
          <FormComponent>
            <label>Emails:</label>
            <InputEl {...register("sendTo")} />
          </FormComponent>
        )}
        <FormComponent>
          <label>Title</label>
          <InputEl {...register("title")} />
        </FormComponent>
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
