import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { useFormContext } from "react-hook-form";

const generateColor = (name: string) => {
  if (["background", "foreground"].includes(name)) {
    return `var(--mi-normal-${name}-color)`;
  }
  return `var(--mi-${name}-color)`;
};

export const ColorInput: React.FC<{ name: string; title: string }> = ({
  name,
  title,
}) => {
  const { watch, register } = useFormContext();
  const color = watch(name);
  return (
    <FormComponent>
      {title}
      <div
        className={css`
          display: flex;
          align-items: stretch;
        `}
      >
        <span
          className={css`
            display: inline-block;
            width: 2rem;
            margin: 0.25rem 0.15rem 0.5rem;
            background-color: ${color !== ""
              ? color
              : generateColor(name.split(".")[2])};
          `}
        ></span>
        <InputEl {...register(name)} />
      </div>
    </FormComponent>
  );
};

export default ColorInput;
