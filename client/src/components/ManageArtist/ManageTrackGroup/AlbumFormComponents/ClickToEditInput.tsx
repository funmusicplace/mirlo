import React from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import SavingInput from "./SavingInput";
import Button from "components/common/Button";
import { FaPencil } from "react-icons/fa6";
import { css } from "@emotion/css";
import { FaCheck } from "react-icons/fa";
import api from "services/api";

const ClickToEditInput: React.FC<{
  defaultValue: string;
  url: string;
  formKey: string;
  reload?: () => void;
}> = ({ url, formKey, defaultValue, reload }) => {
  const [isEditing, setIsEditing] = React.useState(false);

  const methods = useForm({
    defaultValues: {
      [formKey]: defaultValue,
    },
  });

  React.useEffect(() => {
    if (defaultValue) {
      methods.setValue(formKey, defaultValue);
    }
  }, [defaultValue, formKey]);

  const currentValue = methods.watch(formKey);

  const save = React.useCallback(async () => {
    try {
      const value = methods.getValues(formKey);

      const data = {
        [formKey]: value,
      };

      await api.put<unknown, unknown>(url, data);
      reload?.();
    } catch (e) {
    } finally {
      setIsEditing(false);
    }
  }, [formKey, url, methods]);

  return (
    <>
      {!isEditing && (
        <div>
          {currentValue}
          <Button
            type="button"
            variant="dashed"
            className={css`
              margin-left: 0.5rem;
            `}
            startIcon={<FaPencil />}
            onClick={() => setIsEditing(true)}
          />
        </div>
      )}
      {isEditing && (
        <div
          className={css`
            display: flex;
          `}
        >
          <FormProvider {...methods}>
            <SavingInput
              formKey={formKey}
              url={url}
              reload={reload}
              onEnter={save}
            />
            <Button
              type="button"
              variant="dashed"
              startIcon={<FaCheck />}
              onClick={save}
            />
          </FormProvider>
        </div>
      )}
    </>
  );
};

export default ClickToEditInput;
