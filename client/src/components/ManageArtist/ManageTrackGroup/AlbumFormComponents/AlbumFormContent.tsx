import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { useTranslation } from "react-i18next";

import UploadArtistImage from "../../UploadArtistImage";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";
import { css } from "@emotion/css";
import { bp } from "../../../../constants";
import ManageTags from "./ManageTags";

import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";

import PriceAndSuch from "./PriceAndSuch";

export const FormSection = styled.div`
  margin: 2rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--mi-darken-x-background-color);
`;

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
}> = ({ existingObject, reload }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const {
    formState: { errors },
  } = useFormContext();
  const { artistId, trackGroupId } = useParams();

  return (
    <>
      <FormSection>
        <h2>{t("aboutTheAlbum")}</h2>
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
              gap: 1rem;

              > div {
                flex-grow: 1;
              }
            }
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
      </FormSection>
      <PriceAndSuch reload={reload} existingObject={existingObject} />
      <FormComponent>
        <label>{t("about")} </label>
        <SavingInput
          formKey="about"
          rows={5}
          url={`manage/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
      <FormComponent>
        <label>{t("credits")} </label>
        <SavingInput
          formKey="credits"
          rows={5}
          url={`manage/trackGroups/${trackGroupId}`}
          extraData={{ artistId: Number(artistId) }}
        />
      </FormComponent>
    </>
  );
};

export default AlbumFormContent;
