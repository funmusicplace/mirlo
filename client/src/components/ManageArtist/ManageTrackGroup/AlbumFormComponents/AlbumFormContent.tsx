import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/ManageTrackGroup";
import PublishButton from "components/ManageArtist/PublishButton";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { FaEye } from "react-icons/fa";
import { getReleaseUrl, isTrackGroupPublished } from "utils/artist";

import { bp } from "../../../../constants";
import UploadArtistImage from "../../UploadArtistImage";
import { TrackGroupFormData } from "../ManageTrackGroup";

import FundraisingGoal from "./FundraisingGoal";
import ManageTags from "./ManageTags";
import PreOrderSection from "./PreOrderSection";
import PriceAndSuch from "./PriceAndSuch";
import SaveDraftBar from "./SaveDraftBar";
import SchedulePublication from "./SchedulePublication";
import VisibilityRadio from "./VisibilityRadio";

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
  reload: () => Promise<unknown>;
  onSaveSuccess?: () => void;
}> = ({ existingObject, reload, onSaveSuccess }) => {
  const { register, watch } = useFormContext<TrackGroupFormData>();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const urlSlug = watch("urlSlug");
  const releaseDateValue = watch("releaseDate");

  const hasReleaseDate = Boolean(releaseDateValue);

  return (
    <>
      <div className="flex flex-wrap items-start gap-2 mt-4">
        <SaveDraftBar
          existingObject={existingObject}
          reload={reload}
          onSaveSuccess={onSaveSuccess}
        />
        {!isTrackGroupPublished(existingObject) &&
          (existingObject.tracks?.length > 0 || !!existingObject.fundraiser) &&
          existingObject.artist && (
            <ArtistButtonLink
              to={getReleaseUrl(existingObject.artist, existingObject)}
              startIcon={<FaEye />}
              variant="dashed"
            >
              {t("previewRelease")}
            </ArtistButtonLink>
          )}
        <div className="ml-auto flex flex-col items-end gap-1">
          <PublishButton
            trackGroup={existingObject}
            reload={reload}
            onSaveSuccess={onSaveSuccess}
          />
          <SchedulePublication
            existingObject={existingObject}
            reload={reload}
          />
        </div>
      </div>
      <VisibilityRadio existingObject={existingObject} />
      <PreOrderSection
        existingObject={existingObject}
        reload={reload}
        hasReleaseDate={hasReleaseDate}
      />
      <FormSection>
        <h2>{t("keyDetails")}</h2>
        <div className="md:grid md:grid-cols-2 gap-4">
          <FormComponent>
            <label htmlFor="input-title">{t("title")}</label>
            <InputEl id="input-title" {...register("title")} />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-slug">{t("urlSlug")}</label>
            <InputEl id="input-slug" {...register("urlSlug")} />
            {isTrackGroupPublished(existingObject) && (
              <small>
                <span>
                  {t("fullUrlIs", {
                    currentUrlSlug: `${window.location.origin}/${existingObject.artist.urlSlug}/release/${urlSlug}`,
                  })}
                  .{" "}
                </span>
                <span className="bg-(--mi-background-color) text-(--mi-warning-color)">
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
          <FormComponent>
            <label htmlFor="input-release-date">{t("releaseDate")}</label>
            <InputEl
              aria-describedby="hint-release-date"
              id="input-release-date"
              type="date"
              {...register("releaseDate")}
            />
            <small id="hint-release-date">
              {existingObject.scheduleEndOnReleaseDate ? (
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
          <TextArea id="input-about" rows={5} {...register("about")} />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-credits">{t("credits")} </label>
          <TextArea id="input-credits" rows={5} {...register("credits")} />
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
            <InputEl id="input-catalog-number" {...register("catalogNumber")} />
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
