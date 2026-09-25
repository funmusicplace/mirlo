import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const StorageSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const { register, watch } = useFormContext<FormSettings>();
  const useConsolidatedBuckets = watch("useConsolidatedBuckets");

  return (
    <SettingsSection id="settings-storage" title={t("storage")}>
      <FormComponent direction="row">
        <InputEl
          id="input-use-consolidated-buckets"
          type="checkbox"
          aria-describedby="hint-use-consolidated-buckets"
          {...register("useConsolidatedBuckets")}
        />
        <div className="flex flex-col">
          <label htmlFor="input-use-consolidated-buckets">
            {t("useConsolidatedBuckets")}
          </label>
          <small id="hint-use-consolidated-buckets" className="max-w-md">
            {t("useConsolidatedBucketsHint")}
          </small>
        </div>
      </FormComponent>
      {useConsolidatedBuckets && (
        <FormComponent>
          <label htmlFor="input-bucket-prefix">{t("bucketPrefix")}</label>
          <InputEl
            id="input-bucket-prefix"
            type="text"
            className="max-w-xs"
            placeholder={t("bucketPrefixPlaceholder")}
            {...register("bucketPrefix")}
          />
        </FormComponent>
      )}
    </SettingsSection>
  );
};

export default StorageSection;
