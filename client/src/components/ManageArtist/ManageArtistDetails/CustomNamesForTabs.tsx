import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { ArtistFormData, ArtistFormSection } from "pages/manage/artists/:artistId/customize/Index";
import SortableTabsOrder from "./SortableTabsOrder";

export const CustomNamesForTabs: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { data: artist } = useManagedArtistQuery();

  const methods = useFormContext<ArtistFormData>();

  if (!artist) {
    return null;
  }

  return (
    <>
      <ArtistFormSection>
        <SortableTabsOrder />
      </ArtistFormSection>

      <ArtistFormSection>
        <div className="w-full">
          <h2>{t("otherText")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormComponent>
              <label htmlFor="input-support-button-text">
                {t("supportButtonText")}
              </label>
              <InputEl
                id="input-support-button-text"
                type="text"
                placeholder={t("support") ?? ""}
                {...methods.register("properties.titles.supportButton")}
              />
            </FormComponent>
            {artist.isLabelProfile && (
              <FormComponent>
                <label htmlFor="input-group-name">{t("groupName")}</label>
                <InputEl
                  id="input-group-name"
                  type="text"
                  placeholder={t("label") ?? ""}
                  {...methods.register("properties.titles.groupName")}
                />
              </FormComponent>
            )}
          </div>
        </div>
      </ArtistFormSection>
    </>
  );
};

export default CustomNamesForTabs;
