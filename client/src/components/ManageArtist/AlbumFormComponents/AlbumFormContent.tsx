import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { useTranslation } from "react-i18next";

import UploadArtistImage from "../UploadArtistImage";
import FormError from "components/common/FormError";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";
import { css } from "@emotion/css";
import { bp } from "../../../constants";
import ManageTags from "./ManageTags";
import PaymentSlider from "./PaymentSlider";

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
}> = ({ existingObject }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const {
    formState: { errors },
  } = useFormContext();
  const { artistId, trackGroupId } = useParams();

  return (
    <>
      <FormComponent>
        <label>{t("title")}</label>
        <SavingInput
          formKey="title"
          url={`manage/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <div
        className={css`
          @media screen and (min-width: ${bp.medium}px) {
            display: flex;
            flex-direction: row;
          }
        `}
      >
        <FormComponent
          style={{
            flexDirection: "column",
            marginRight: "1rem",
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <label>{t("cover")}</label>

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

        {/* <FormComponent>
        {t("type")}:{" "}
        <SelectEl defaultValue="lp" {...register("type")}>
          <option value="lp">{t("lp")}</option>
          <option value="ep">{t("ep")}</option>
          <option value="single">{t("single")}</option>
          <option value="compilation">{t("compilation")}</option>
        </SelectEl>
        <small>The type is optional</small>
      </FormComponent> */}

        <div
          className={css`
            flex-grow: 1;
          `}
        >
          <FormComponent>
            <label>{t("releaseDate")} </label>
            <SavingInput
              formKey="releaseDate"
              type="date"
              required
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
            />
          </FormComponent>

          <div
            className={css`
              width: 100%;
              @media screen and (min-width: ${bp.medium}px) {
                display: flex;
                flex-direction: row;
              }
            `}
          >
            <FormComponent>
              <label>{t("price")}</label>
              <SavingInput
                formKey="minPrice"
                type="number"
                step="0.01"
                url={`manage/trackGroups/${trackGroupId}`}
                extraData={{ artistId: Number(artistId) }}
              />
              {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
            </FormComponent>
            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <label>{t("platformPercent")}</label>
              <PaymentSlider
                url={`manage/trackGroups/${trackGroupId}`}
                extraData={{ artistId: Number(artistId) }}
              />
              {errors.minPrice && <FormError>{t("platformPercent")}</FormError>}
            </FormComponent>
          </div>
          <ManageTags tags={existingObject.tags} />
        </div>
      </div>
      <FormComponent>
        <label>{t("about")} </label>
        <SavingInput
          formKey="about"
          rows={8}
          url={`manage/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent>
        <label>{t("credits")} </label>
        <SavingInput
          formKey="credits"
          rows={8}
          url={`manage/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
    </>
  );
};

export default AlbumFormContent;
