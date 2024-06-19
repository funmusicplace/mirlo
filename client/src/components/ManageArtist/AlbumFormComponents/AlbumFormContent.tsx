import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { useTranslation } from "react-i18next";

import UploadArtistImage from "../UploadArtistImage";
import FormError from "components/common/FormError";
import { useAuthContext } from "state/AuthContext";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
}> = ({ existingObject }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const {
    formState: { errors },
  } = useFormContext();
  const { user } = useAuthContext();
  const userId = user?.id;
  const { artistId, trackGroupId } = useParams();

  return (
    <>
      <FormComponent>
        <label>{t("title")}</label>
        <SavingInput
          formKey="title"
          url={`users/${userId}/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent
        style={{
          flexDirection: "column",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <label>{t("cover")}</label>

        <UploadArtistImage
          imageTypeDescription="an album cover"
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

      <FormComponent>
        <label>{t("releaseDate")} </label>
        <SavingInput
          formKey="releaseDate"
          type="date"
          required
          url={`users/${userId}/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent>
        <label>{t("about")} </label>
        <SavingInput
          formKey="about"
          rows={8}
          url={`users/${userId}/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent>
        <label>{t("credits")} </label>
        <SavingInput
          formKey="credits"
          rows={8}
          url={`users/${userId}/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent>
        <label>{t("price")}</label>
        <SavingInput
          formKey="price"
          type="number"
          url={`users/${userId}/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
        {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
      </FormComponent>
    </>
  );
};

export default AlbumFormContent;
