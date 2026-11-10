import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getFundraiserUrl } from "utils/artist";

import { FundraiserFormData } from "./fundraiserFormData";

const FundraiserVisibilityFields: React.FC<{
  artist: { id: number; urlSlug?: string };
  fundraiser: Pick<Fundraiser, "id" | "urlSlug" | "isPublic">;
}> = ({ artist, fundraiser }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const { register } = useFormContext<FundraiserFormData>();

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
      <FormComponent direction="row">
        <div>
          <InputEl
            aria-describedby="description-fundraiser-is-public"
            id="input-fundraiser-is-public"
            type="checkbox"
            {...register("fundraiserIsPublic")}
          />
        </div>
        <div className="flex flex-col pl-2">
          <label htmlFor="input-fundraiser-is-public">{t("isPublic")}</label>
          <small id="description-fundraiser-is-public">
            {t("isPublicDescription")}
          </small>
          {fundraiser.isPublic && (
            <small>
              <Link to={getFundraiserUrl(artist, fundraiser)}>
                {t("viewPage")}
              </Link>
            </small>
          )}
        </div>
      </FormComponent>
      <FormComponent>
        <label htmlFor="input-fundraiser-url-slug">{t("urlSlug")}</label>
        <InputEl
          id="input-fundraiser-url-slug"
          aria-describedby="description-fundraiser-url-slug"
          required
          {...register("fundraiserUrlSlug")}
        />
        {fundraiser.isPublic && (
          <small
            id="description-fundraiser-url-slug"
            className="text-(--mi-warning-color)"
          >
            {t("urlSlugWarning")}
          </small>
        )}
      </FormComponent>
    </div>
  );
};

export default FundraiserVisibilityFields;
