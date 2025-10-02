import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { useTranslation } from "react-i18next";

import FormError from "components/common/FormError";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";
import { css } from "@emotion/css";
import { bp } from "../../../../constants";
import PaymentSlider from "./PaymentSlider";
import { getCurrencySymbol } from "components/common/Money";
import { useAuthContext } from "state/AuthContext";
import SetPriceOfAllTracks from "../SetPriceOfAllTracks";
import { CheckBoxLabel } from "components/common/FormCheckbox";
import { FormSection } from "./AlbumFormContent";
import Tooltip from "components/common/Tooltip";
import { FaInfo } from "react-icons/fa";

const PriceAndSuch: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
}> = ({ existingObject, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { artistId, trackGroupId } = useParams();
  const {
    formState: { errors },
    watch,
  } = useFormContext();
  const { user } = useAuthContext();

  const preventAlbumPurchase = watch("isGettable", false);
  const isAlbumGettable = !preventAlbumPurchase;
  return (
    <FormSection>
      <h2>{t("priceAndSuch")}</h2>
      <div
        className={css`
          flex-grow: 1;
        `}
      >
        <FormComponent>
          <CheckBoxLabel htmlFor="isGettable">
            <SavingInput
              timer={0}
              formKey="isGettable"
              id="isGettable"
              type="checkbox"
              url={`manage/trackGroups/${trackGroupId}`}
              extraData={{ artistId: Number(artistId) }}
              valueTransform={(value) => !value}
            />
            {t("isGettable")}
            <Tooltip hoverText={t("isGettableTooltip")}>
              <FaInfo />
            </Tooltip>
          </CheckBoxLabel>
          <small>{t("isGettableInfo")}</small>
        </FormComponent>

        <div
          className={css`
            width: 100%;
            @media screen and (min-width: ${bp.medium}px) {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
            }
          `}
        >
          {isAlbumGettable && (
            <>
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
                {errors.minPrice && (
                  <FormError>{t("priceZeroOrMore")}</FormError>
                )}
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
                {errors.platformPercent && (
                  <FormError>{t("platformPercent")}</FormError>
                )}
              </FormComponent>
            </>
          )}
        </div>
        {existingObject && existingObject?.tracks?.length > 0 && (
          <SetPriceOfAllTracks tracks={existingObject.tracks} reload={reload} />
        )}
      </div>
    </FormSection>
  );
};

export default PriceAndSuch;
