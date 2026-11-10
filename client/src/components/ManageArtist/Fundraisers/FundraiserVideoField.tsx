import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import LazyIframe from "components/common/LazyIframe";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FundraiserFormData } from "./fundraiserFormData";

const FundraiserVideoField: React.FC<{ videoEmbedUrl?: string | null }> = ({
  videoEmbedUrl,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const { register } = useFormContext<FundraiserFormData>();

  return (
    <FormComponent>
      <label htmlFor="input-fundraiser-video-url">{t("videoUrl")}</label>
      <InputEl
        id="input-fundraiser-video-url"
        type="url"
        placeholder="https://www.youtube.com/watch?v=…"
        aria-describedby="description-fundraiser-video-url"
        {...register("fundraiserVideoUrl")}
      />
      <span className="text-sm" id="description-fundraiser-video-url">
        {t("videoUrlDescription")}
      </span>
      {videoEmbedUrl && (
        <LazyIframe
          src={videoEmbedUrl}
          title={t("videoPreview")}
          className="mt-2 aspect-video w-full max-w-xl border-0"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}
    </FormComponent>
  );
};

export default FundraiserVideoField;
