import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { ArtistFormData, ArtistFormSection } from "pages/manage/artists/:artistId/customize/Index";

export const LayoutSettings: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { data: artist } = useManagedArtistQuery();

  const methods = useFormContext<ArtistFormData>();

  if (!artist) {
    return null;
  }

  return (
    <ArtistFormSection isOdd>
      <div className="w-full">
        <h2>{t("layout")}</h2>
        <FormComponent className="max-w-[300px]">
          <label htmlFor="input-releases-per-row">{t("releasesPerRow")}</label>
          <SelectEl
            id="input-releases-per-row"
            {...methods.register("properties.releasesPerRow", {
              valueAsNumber: true,
            })}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
          </SelectEl>
          <small>{t("releasesPerRowDescription")}</small>
        </FormComponent>
      </div>
    </ArtistFormSection>
  );
};

export default LayoutSettings;
