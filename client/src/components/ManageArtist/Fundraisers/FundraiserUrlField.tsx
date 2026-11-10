import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getFundraiserUrl } from "utils/artist";
import { FundraiserFormData } from "utils/fundraiserFormData";

const FundraiserUrlField: React.FC<{
  artist: { id: number; urlSlug?: string };
  fundraiser: Pick<Fundraiser, "id" | "urlSlug" | "isPublic">;
}> = ({ artist, fundraiser }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const { register, watch, formState } = useFormContext<FundraiserFormData>();
  const [isEditing, setIsEditing] = React.useState(false);
  const urlSlug = watch("urlSlug") || fundraiser.urlSlug;
  const error = formState.errors.urlSlug?.message;

  return (
    <>
      <small>
        {t("urlWillBe")}
        {window.location.origin}
        {getFundraiserUrl(artist, { ...fundraiser, urlSlug })}{" "}
        {!isEditing && (
          <ArtistButton
            type="button"
            variant="link"
            size="compact"
            className="text-xs"
            onClick={() => setIsEditing(true)}
          >
            {t("changeUrl")}
          </ArtistButton>
        )}
      </small>
      {isEditing && (
        <>
          <label htmlFor="input-fundraiser-url-slug" className="mt-2 block">
            {t("urlSlug")}
          </label>
          <InputEl
            id="input-fundraiser-url-slug"
            aria-describedby="description-fundraiser-url-slug"
            aria-invalid={!!error}
            {...register("urlSlug")}
          />
          {error && (
            <small className="error" role="alert">
              {error}
            </small>
          )}
          {fundraiser.isPublic && (
            <small
              id="description-fundraiser-url-slug"
              className="text-(--mi-warning-color)"
            >
              {t("urlSlugWarning")}
            </small>
          )}
        </>
      )}
    </>
  );
};

export default FundraiserUrlField;
