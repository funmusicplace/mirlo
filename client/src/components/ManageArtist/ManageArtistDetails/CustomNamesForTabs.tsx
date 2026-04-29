import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

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
            <label htmlFor="input-releases-tab">{t("releasesTab")}</label>
            <InputEl
              id="input-releases-tab"
              type="text"
              placeholder={t("releases") ?? ""}
              {...methods.register("properties.titles.releases")}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-merch-tab">{t("merchTab")}</label>
            <InputEl
              id="input-merch-tab"
              type="text"
              placeholder={t("merch") ?? ""}
              {...methods.register("properties.titles.merch")}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-posts-tab">{t("postsTab")}</label>
            <InputEl
              id="input-posts-tab"
              type="text"
              placeholder={t("posts") ?? ""}
              {...methods.register("properties.titles.posts")}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-support-tab">{t("supportTab")}</label>
            <InputEl
              id="input-support-tab"
              type="text"
              placeholder={t("support") ?? ""}
              {...methods.register("properties.titles.support")}
            />
          </FormComponent>
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
              <label htmlFor="input-roster-tab">{t("rosterTab")}</label>
              <InputEl
                id="input-roster-tab"
                type="text"
                placeholder={t("roster") ?? ""}
                {...methods.register("properties.titles.roster")}
              />
            </FormComponent>
          )}
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
  );
};

export default CustomNamesForTabs;
