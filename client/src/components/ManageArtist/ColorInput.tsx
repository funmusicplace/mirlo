import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

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
  const colors = watch("properties.colors");
  const { user } = useAuthContext();
  const { mutateAsync: updateArtist } = useUpdateArtistMutation();
  const { artistId } = useParams();

  const updateColorOnChange = React.useCallback(async () => {
    try {
      if (user && artistId) {
        await updateArtist({
          userId: user.id,
          artistId: Number(artistId),
          body: {
            properties: {
              colors,
            },
          },
        });
      }
    } catch (e) {}
  }, [colors]);

  return (
    <FormComponent
      className={css`
        margin-bottom: 0 !important;
      `}
    >
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
        <InputEl {...register(name)} onBlur={updateColorOnChange} />
      </div>
    </FormComponent>
  );
};

export default ColorInput;
