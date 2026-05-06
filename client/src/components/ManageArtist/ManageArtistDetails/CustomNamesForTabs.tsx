import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { ArtistFormData, ArtistFormSection } from "./CustomizeLook";
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
        <div
          className={css`
            width: 100%;
          `}
        >
          <h2>{t("otherText")}</h2>
          <div
            className={css`
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            `}
          >
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
