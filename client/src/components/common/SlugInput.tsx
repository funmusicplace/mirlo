import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import slugify from "slugify";

const SlugInput: React.FC<{
  isDisabled?: boolean;
  type: "user" | "artist";
  currentArtistId?: number;
  currentName?: string;
}> = ({ currentArtistId, isDisabled, type, currentName }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const validation = React.useCallback(
    async (value: string) => {
      try {
        let url = "";
        if (type === "artist") {
          let artistIdString = currentArtistId
            ? `&forArtistId=${currentArtistId}`
            : "";
          url = `artists/testExistence?urlSlug=${value.toLowerCase()}${artistIdString}`;
        } else if (type === "user") {
          url = `users/testExistence?urlSlug=${value}`;
        }

        console.log("url", url);

        const response = await api.get<{ exists: boolean }>(url);
        return !response.result.exists;
      } catch (e) {
        console.error("Error checking slug uniqueness", e);
        return true;
      }
    },
    [currentArtistId]
  );

  const useCurrentNameAsSlug = React.useCallback(() => {
    if (currentName) {
      const slug = slugify(currentName, { lower: true });
      setValue("urlSlug", slug);
    }
    return "";
  }, [currentName]);

  const urlSlug = watch("urlSlug");

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
      <small>{t("mustBeUnique")}</small>
      {errors.urlSlug && (
        <small className="error">
          {errors.urlSlug.type === "unique" && t("needsToBeUnique")}
        </small>
      )}
      {!urlSlug && currentName && (
        <small
          className={css`
            display: flex;
            align-items: center;
          `}
        >
          {t("useUrlSlug", { suggestedUrlSlug: slugify("hell") })}
          <ArtistButton
            variant="link"
            size="compact"
            type="button"
            onClick={useCurrentNameAsSlug}
            className={css`
              width: 10rem;
              margin-left: 0 !important;
            `}
          >
            {t("useIt")}
          </ArtistButton>
        </small>
      )}
    </>
  );
};
export default SlugInput;
