import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const SelectTrackPreview: React.FC<{ statusKey: string }> = ({ statusKey }) => {
  const { register } = useFormContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  return (
    <SelectEl defaultValue="paid" {...register(statusKey)}>
      <option value="preview">{t("preview")}</option>
      <option value="must-own">{t("mustOwn")}</option>
    </SelectEl>
  );
};

export default SelectTrackPreview;
