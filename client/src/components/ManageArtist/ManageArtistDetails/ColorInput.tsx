import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const isValidColor = (val: string) => {
  const matcher = val.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  return matcher;
};

export const ColorInput: React.FC<{ name: string; title: string }> = ({
  name,
  title,
}) => {
  const { register, getFieldState } = useFormContext();

  const errorMessage = getFieldState(name).error?.message ?? "";

  return (
    <FormComponent
      className={css`
        margin-bottom: 0 !important;
        background-color: #e1e1e1;
        padding: 0.5rem 0.75rem;
        color: var(--mi-black);

        input {
          color: var(--mi-black) !important;
        }

        :first-child {
          margin-top: 0;
        }
      `}
    >
      {title}
      <input
        type="color"
        {...register(name, {
          validate: {
            validColor: (val) => !!isValidColor(val) || "Not a valid color!",
          },
        })}
        className={css`
          align-self: center;
          height: 2rem;
          width: 80%;
          cursor: pointer;

          /* For WebKit browsers (Chrome, Safari) */
          &::-webkit-color-swatch-wrapper {
            padding: 0;
          }
          &::-webkit-color-swatch {
            border: none;
          }
          /* For Firefox */
          &::-moz-color-swatch {
            border: none;
          }
        `}
      />
      {errorMessage && (
        <small
          className={css`
            color: var(--mi-warning-color);
          `}
        >
          {errorMessage}
        </small>
      )}
    </FormComponent>
  );
};

export default ColorInput;
