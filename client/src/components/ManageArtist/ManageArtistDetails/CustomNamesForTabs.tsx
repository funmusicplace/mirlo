import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";
import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import useManagedArtistQuery from "utils/useManagedArtistQuery";
import { InputEl } from "components/common/Input";
import { ArtistFormData, ArtistFormSection } from "./CustomizeLook";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export const CustomNamesForTabs: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { data: artist } = useManagedArtistQuery();

  const methods = useFormContext<ArtistFormData>();

  if (!artist) {
    return null;
  }

  return (
    <ArtistFormSection>
      <div
        className={css`
          width: 100%;
        `}
      >
        <h2>{t("customTitles")}</h2>
        <p>{t("customTitlesDescription")}</p>
        <div
          className={css`
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 1rem;
          `}
        >
          <FormComponent>
            <label>{t("releasesTab")}</label>
            <InputEl
              type="text"
              colors={artist.properties?.colors}
              placeholder={t("releases") ?? ""}
              {...methods.register("properties.titles.releases")}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("merchTab")}</label>
            <InputEl
              type="text"
              colors={artist.properties?.colors}
              placeholder={t("merch") ?? ""}
              {...methods.register("properties.titles.merch")}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("postsTab")}</label>
            <InputEl
              type="text"
              colors={artist.properties?.colors}
              placeholder={t("posts") ?? ""}
              {...methods.register("properties.titles.posts")}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("supportTab")}</label>
            <InputEl
              type="text"
              colors={artist.properties?.colors}
              placeholder={t("support") ?? ""}
              {...methods.register("properties.titles.support")}
            />
          </FormComponent>
          {artist.isLabelProfile && (
            <FormComponent>
              <label>{t("groupName")}</label>
              <InputEl
                type="text"
                colors={artist.properties?.colors}
                placeholder={t("label") ?? ""}
                {...methods.register("properties.titles.groupName")}
              />
            </FormComponent>
          )}
        </div>
      </div>
    </ArtistFormSection>
  );
};

export default CustomNamesForTabs;
