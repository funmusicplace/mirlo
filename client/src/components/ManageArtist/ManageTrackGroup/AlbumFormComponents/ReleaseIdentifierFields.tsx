import FormComponent from "components/common/FormComponent";
import FormError from "components/common/FormError";
import { InputEl } from "components/common/Input";
import { RestoredLabel } from "components/common/RestoredFields";
import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const UPC_REGEX = /^\d{12,13}$/;

const ReleaseIdentifierFields: React.FC = () => {
  const { register, watch } = useFormContext<TrackGroupFormData>();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const upcValue = watch("upc");
  const isUpcInvalid =
    !!upcValue?.trim() && !UPC_REGEX.test(upcValue.replace(/[\s-]/g, ""));

  return (
    <div className="md:grid md:grid-cols-2 gap-4">
      <FormComponent>
        <RestoredLabel htmlFor="input-catalog-number" field="catalogNumber">
          {t("catalogNumber")}
        </RestoredLabel>
        <InputEl id="input-catalog-number" {...register("catalogNumber")} />
      </FormComponent>
      <FormComponent>
        <RestoredLabel htmlFor="input-upc" field="upc">
          {t("upc")}
        </RestoredLabel>
        <InputEl
          id="input-upc"
          aria-describedby={`hint-upc${isUpcInvalid ? " error-upc" : ""}`}
          {...register("upc")}
        />
        <small id="hint-upc">{t("upcHint")}</small>
        {isUpcInvalid && (
          <FormError id="error-upc">{t("upcInvalid")}</FormError>
        )}
      </FormComponent>
    </div>
  );
};

export default ReleaseIdentifierFields;
