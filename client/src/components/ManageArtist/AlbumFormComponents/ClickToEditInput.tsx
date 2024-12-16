import React from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import SavingInput from "./SavingInput";
import Button from "components/common/Button";
import { FaPencil } from "react-icons/fa6";
import { css } from "@emotion/css";
import { FaCheck } from "react-icons/fa";

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

  const currentValue = methods.getValues(formKey);

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
            <SavingInput formKey="title" url={url} reload={reload} />
            <Button
              type="button"
              variant="dashed"
              startIcon={<FaCheck />}
              onClick={() => setIsEditing(false)}
            />
          </FormProvider>
        </div>
      )}
    </>
  );
};

export default ClickToEditInput;
