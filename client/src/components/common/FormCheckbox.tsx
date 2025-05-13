import { css } from "@emotion/css";
import { InputEl } from "./Input";
import { useFormContext } from "react-hook-form";
import styled from "@emotion/styled";

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
  description: string;
  disabled?: boolean;
}> = ({ keyName, description, disabled, idPrefix = "" }) => {
  const { register } = useFormContext();

  return (
    <CheckBoxLabel htmlFor={idPrefix + keyName}>
      <InputEl
        id={idPrefix + keyName}
        type="checkbox"
        {...register(keyName)}
        disabled={disabled}
      />
      {description}
    </CheckBoxLabel>
  );
};

export default FormCheckbox;
