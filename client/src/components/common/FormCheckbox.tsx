import { css } from "@emotion/css";
import { InputEl } from "./Input";
import { useFormContext } from "react-hook-form";

const FormCheckbox: React.FC<{
  idPrefix?: string;
  keyName: string;
  description: string;
  disabled?: boolean;
}> = ({ keyName, description, disabled, idPrefix = "" }) => {
  const { register } = useFormContext();

  return (
    <label
      htmlFor={idPrefix + keyName}
      className={css`
        display: flex;
        padding: 0.25rem;
        align-items: center;
        font-size: 0.8rem;
        input {
          width: 2rem;
          margin-right: 0.45rem;
        }
      `}
    >
      <InputEl
        id={idPrefix + keyName}
        type="checkbox"
        {...register(keyName)}
        disabled={disabled}
      />
      {description}
    </label>
  );
};

export default FormCheckbox;
