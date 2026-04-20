import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { Trans, useTranslation } from "react-i18next";

import UploadArtistImage from "../../UploadArtistImage";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";
import { css } from "@emotion/css";
import { bp } from "../../../../constants";
import ManageTags from "./ManageTags";

import PriceAndSuch from "./PriceAndSuch";
import FundraisingGoal from "./FundraisingGoal";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/ManageTrackGroup";
import PreOrderSection from "./PreOrderSection";
import SaveDraftBar from "./SaveDraftBar";

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
  isFlowV2?: boolean;
}> = ({ existingObject, reload, isFlowV2 }) => {
  const { watch } = useFormContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const { artistId, trackGroupId } = useParams();
  const urlSlug = watch("urlSlug");
  const releaseDateValue = watch("releaseDate");

  const hasReleaseDate = Boolean(releaseDateValue);

  return (
    <>
      {isFlowV2 && <SaveDraftBar reload={reload} />}
      {isFlowV2 && (
        <PreOrderSection
          existingObject={existingObject}
          reload={reload}
          hasReleaseDate={hasReleaseDate}
        />
      )}
      <FormSection>
        <h2>{t("keyDetails")}</h2>
        <div className="md:grid md:grid-cols-2 gap-4">
          <FormComponent>
            <label htmlFor="input-title">{t("title")}</label>
            <SavingInput
              formKey="title"
              id="input-title"
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-slug">{t("urlSlug")}</label>
            <SavingInput
              formKey="urlSlug"
              id="input-slug"
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
            />
            {existingObject.publishedAt &&
              new Date(existingObject.publishedAt) < new Date() && (
                <small>
                  <span>
                    {t("fullUrlIs", {
                      currentUrlSlug: `${window.location.origin}/${existingObject.artist.urlSlug}/release/${urlSlug}`,
                    })}
                    .{" "}
                  </span>
                  <span className="bg-(--mi-normal-background-color) text-(--mi-warning-color)">
                    {t("urlSlugWarning")}
                  </span>
                </small>
              )}
          </FormComponent>
        </div>
        <div
          className={css`
            @media screen and (min-width: ${bp.medium}px) {
              display: flex;
              gap: 1rem;

              > div {
                width: 33%;
              }
            }
          `}
        >
          {!isFlowV2 && (
            <FormComponent>
              <label htmlFor="input-published-at">{t("publishedAt")}</label>
              <SavingInput
                ariaDescribedBy="hint-published-at"
                formKey="publishedAt"
                id="input-published-at"
                type="date"
                required
                url={`manage/trackGroups/${trackGroupId}`}
                extraData={{ artistId: Number(artistId) }}
                reload={reload}
              />
              <small id="hint-published-at">{t("publishedAtHint")}</small>
            </FormComponent>
          )}
          <FormComponent>
            <label htmlFor="input-release-date">{t("releaseDate")}</label>
            <SavingInput
              ariaDescribedBy="hint-release-date"
              formKey="releaseDate"
              id="input-release-date"
              type="date"
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
            />
            <small id="hint-release-date">
              {!isFlowV2 ? (
                t("releasedAtHint")
              ) : existingObject.scheduleEndOnReleaseDate ? (
                <Trans
                  i18nKey="manageAlbum.releaseDateScheduledHint"
                  components={{ strong: <strong /> }}
                />
              ) : (
                t("releaseDateInfoText")
              )}
            </small>
          </FormComponent>
          <ManageTags tags={existingObject.tags} />
        </div>
      </FormSection>
      <FormSection>
        <h2>{t("artwork")}</h2>
        <FormComponent
          style={{
            flexDirection: "column",
            marginRight: "1rem",
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <UploadArtistImage
            imageTypeDescription={t("anAlbumCover")}
            existing={existingObject}
            imageType="cover"
            height="400"
            width="400"
            maxDimensions="1500x1500"
            maxSize="15mb"
          />
        </FormComponent>
      </FormSection>
      <PriceAndSuch reload={reload} existingObject={existingObject} />
      <FormSection>
        <h2>{t("aboutTheAlbum")}</h2>
        <FormComponent>
          <label htmlFor="input-about">{t("about")} </label>
          <SavingInput
            formKey="about"
            id="input-about"
            rows={5}
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-credits">{t("credits")} </label>
          <SavingInput
            formKey="credits"
            id="input-credits"
            rows={5}
            url={`manage/trackGroups/${trackGroupId}`}
            extraData={{ artistId: Number(artistId) }}
          />
        </FormComponent>
        <div
          className={css`
            @media screen and (min-width: ${bp.medium}px) {
              display: flex;
              gap: 1rem;
              > div {
                width: 33%;
              }
            }
          `}
        >
          <FormComponent>
            <label htmlFor="input-catalog-number">{t("catalogNumber")}</label>
            <SavingInput
              formKey="catalogNumber"
              id="input-catalog-number"
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
            />
          </FormComponent>
        </div>
      </FormSection>
      <FormSection>
        <FundraisingGoal
          trackGroupId={existingObject.id}
          fundraiser={existingObject.fundraiser}
        />
      </FormSection>
    </>
  );
};

export default AlbumFormContent;
