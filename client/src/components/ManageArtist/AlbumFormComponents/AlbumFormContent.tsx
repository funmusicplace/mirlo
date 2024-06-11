import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { useTranslation } from "react-i18next";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";
import UploadArtistImage from "../UploadArtistImage";
import FormError from "components/common/FormError";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useParams } from "react-router-dom";
import LoadingSpinner from "components/common/LoadingSpinner";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import { FaCheck } from "react-icons/fa";

const SavingInput: React.FC<{
  formKey: string;
  url: string;
  extraData: Object;
  rows?: number;
  required?: boolean;
  type?: string;
}> = ({ formKey, url, extraData, type, required, rows }) => {
  const { register, getValues } = useFormContext();
  const errorHandler = useErrorHandler();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const saveOnBlur = React.useCallback(async () => {
    try {
      setSaveSuccess(false);
      setIsSaving(true);
      let value = getValues(formKey);

      if (formKey === "releaseDate") {
        value = new Date(value).toISOString();
      } else if (formKey === "minPrice") {
        value = value ? value * 100 : undefined;
      }

      await api.put<unknown, TrackGroup>(url, {
        [formKey]: value,
        ...extraData,
      });
      let timeout2: NodeJS.Timeout;
      const timeout = setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        timeout2 = setTimeout(() => {
          setSaveSuccess(false);
        }, 1000);
      }, 1000);
      return () => {
        clearTimeout(timeout2);
        clearTimeout(timeout);
      };
    } catch (e) {
      errorHandler(e);
      setIsSaving(false);
    }
  }, [formKey, getValues, url, extraData]);

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
        align-items: center;

        input,
        textarea {
          margin-right: 1rem;
        }
      `}
    >
      {!rows && (
        <InputEl
          {...register(formKey)}
          onBlur={saveOnBlur}
          type={type}
          required={required}
        />
      )}
      {rows && <TextArea {...register(formKey)} rows={7} onBlur={saveOnBlur} />}
      {isSaving && <LoadingSpinner />}
      {saveSuccess && <FaCheck />}
    </div>
  );
};

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
          formKey="date"
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
