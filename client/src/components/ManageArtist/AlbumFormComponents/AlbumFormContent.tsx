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
import { getCurrencySymbol } from "components/common/Money";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";

const FormSection = styled.div`
  margin: 2rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--mi-darken-x-background-color);
`;

const AlbumFormContent: React.FC<{
  existingObject: TrackGroup;
}> = ({ existingObject }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const {
    formState: { errors },
  } = useFormContext();
  const { artistId, trackGroupId } = useParams();

  return (
    <>
      <FormSection>
        <h2>About the album</h2>
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
        <h2>Artwork</h2>
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
      <FormSection>
        <h2>Price and such</h2>
        <div
          className={css`
            flex-grow: 1;
          `}
        >
          <div
            className={css`
              width: 100%;
              @media screen and (min-width: ${bp.medium}px) {
                display: flex;
                flex-direction: row;
              }
            `}
          >
            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <label>{t("price")}</label>
              <div
                className={css`
                  display: flex;
                  align-items: center;
                `}
              >
                <div
                  className={css`
                    width: 2rem;
                    height: 89%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 0.25rem;
                    background-color: var(--mi-darken-x-background-color);
                  `}
                >
                  {user?.currency && getCurrencySymbol(user?.currency)}
                </div>
                <SavingInput
                  formKey="minPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  url={`manage/trackGroups/${trackGroupId}`}
                  extraData={{ artistId: Number(artistId) }}
                />
              </div>
              {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
              <small
                className={css`
                  max-width: 200px;
                `}
              >
                {t("currencyIsSetOnManageArtist")}
              </small>
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
        </div>
      </FormSection>
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
