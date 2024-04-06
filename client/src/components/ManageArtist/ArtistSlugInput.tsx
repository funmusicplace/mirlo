import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import api from "services/api";

const ArtistSlugInput: React.FC<{
  isDisabled?: boolean;
  currentArtistId?: number;
}> = ({ currentArtistId, isDisabled }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const validation = React.useCallback(
    async (value: string) => {
      try {
        let artistIdString = currentArtistId
          ? `&forArtistId=${currentArtistId}`
          : "";
        const response = await api.get<{ exists: boolean }>(
          `artists/testExistence?urlSlug=${value.toLowerCase()}${artistIdString}`,
        );
        return !response.result.exists;
      } catch (e) {
        return true;
      }
    },
    [currentArtistId],
  );

  return (
    <>
      <InputEl
        {...register("urlSlug", {
          validate: { unique: validation },
          disabled: isDisabled,
        })}
        className={css`
          margin-bottom: 0.5rem;
        `}
      />
      <small>Must be unique</small>
      {errors.urlSlug && (
        <small className="error">
          {errors.urlSlug.type === "unique" &&
            "This needs to be unique, try something else"}
        </small>
      )}
    </>
  );
};
export default ArtistSlugInput;
