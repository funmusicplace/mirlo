import styled from "@emotion/styled";
import { useFormContext } from "react-hook-form";

import { InputEl } from "./Input";

export const CheckBoxLabel = styled.label`
  display: flex;
  padding: 0.25rem;
  align-items: center;
  font-size: 1rem;
  input {
    width: 2rem !important;
    margin-right: 0.45rem;
  }

  > div {
    width: 2rem !important;
  }
`;

const FormCheckbox: React.FC<{
  idPrefix?: string;
  keyName: string;
  description: string | React.ReactNode;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
}> = ({ keyName, description, hint, disabled, idPrefix = "", required }) => {
  const { register } = useFormContext();
  const hintId = `hint-${idPrefix}${keyName}`;

  return (
    <div>
      <CheckBoxLabel htmlFor={idPrefix + keyName}>
        <InputEl
          id={idPrefix + keyName}
          type="checkbox"
          {...register(keyName)}
          disabled={disabled}
          required={required}
          aria-describedby={hint ? hintId : undefined}
        />
        {description}
      </CheckBoxLabel>
      {hint && (
        <small
          id={hintId}
          className="block text-(--mi-secondary-text-color) mt-1 ml-9"
        >
          {hint}
        </small>
      )}
    </div>
  );
};

export default FormCheckbox;
