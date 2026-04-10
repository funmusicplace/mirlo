import React from "react";
import { useFormContext } from "react-hook-form";

import FormComponent from "components/common/FormComponent";

import { Trans, useTranslation } from "react-i18next";

import FormError from "components/common/FormError";
import { useParams } from "react-router-dom";

import SavingInput from "./SavingInput";
import { css } from "@emotion/css";
import { bp } from "../../../../constants";
import PaymentSlider from "./PaymentSlider";
import { getCurrencySymbol } from "components/common/Money";
import { useAuthContext } from "state/AuthContext";
import SetPriceOfAllTracks from "../SetPriceOfAllTracks";
import { FormSection } from "./AlbumFormContent";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { InputEl } from "components/common/Input";
import ArtistRouterLink, {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import { TrackGroupFormData } from "../ManageTrackGroup";
import useManagedArtistQuery from "utils/useManagedArtistQuery";
import { getArtistManageTiersUrl } from "utils/artist";

type PricingMode = "free-or-donate" | "paid" | "no-payments";

const PriceAndSuch: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
}> = ({ existingObject, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { artistId, trackGroupId } = useParams();
  const { data: artist } = useManagedArtistQuery();
  const errorHandler = useErrorHandler();
  const { colors } = useGetArtistColors();
  const {
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useFormContext<TrackGroupFormData>();
  const { user } = useAuthContext();
  const [isUpdatingPricingMode, setIsUpdatingPricingMode] =
    React.useState(false);

  const isAlbumGettable = watch("isGettable", false);
  const minPrice = Number(watch("minPrice") || 0);
  const suggestedPrice = watch("suggestedPrice");
  const hasSuggestedPrice =
    suggestedPrice !== undefined &&
    suggestedPrice !== null &&
    suggestedPrice !== "";

  const selectedPricingMode: PricingMode = !isAlbumGettable
    ? "no-payments"
    : minPrice > 0
      ? "paid"
      : "free-or-donate";

  const savePricingState = React.useCallback(
    async ({
      isGettable,
      nextMinPrice,
      nextSuggestedPrice,
    }: {
      isGettable: boolean;
      nextMinPrice: number;
      nextSuggestedPrice?: number | null;
    }) => {
      if (!trackGroupId) {
        return;
      }

      await api.put(`manage/trackGroups/${trackGroupId}`, {
        artistId: Number(artistId),
        isGettable: isGettable,
        minPrice: Math.round(nextMinPrice * 100),
        suggestedPrice:
          nextSuggestedPrice === null || nextSuggestedPrice === undefined
            ? null
            : Math.round(nextSuggestedPrice * 100),
      });
    },
    [artistId, trackGroupId]
  );

  /* We toggle some defaults on selecting of a new pricing mode */
  const onSelectPricingMode = React.useCallback(
    async (mode: PricingMode) => {
      const currentMinPrice = Number(getValues("minPrice") || 0);
      const currentSuggestedPrice = Number(getValues("suggestedPrice") || 0);

      let isGettable = true;
      let nextMinPrice = currentMinPrice;
      let nextSuggestedPrice: number | null | undefined = hasSuggestedPrice
        ? currentSuggestedPrice
        : null;

      if (mode === "no-payments") {
        isGettable = false;
        nextMinPrice = 0;
        nextSuggestedPrice = null;
      }

      if (mode === "free-or-donate") {
        isGettable = true;
        nextMinPrice = 0;
      }

      if (mode === "paid") {
        isGettable = true;
        if (nextMinPrice <= 0) {
          nextMinPrice = currentSuggestedPrice > 0 ? currentSuggestedPrice : 1;
        }
      }

      setIsUpdatingPricingMode(true);
      try {
        setValue("isGettable", isGettable);
        setValue("minPrice", `${nextMinPrice}`);
        setValue(
          "suggestedPrice",
          nextSuggestedPrice === null || nextSuggestedPrice === undefined
            ? ""
            : `${nextSuggestedPrice}`
        );

        await savePricingState({
          isGettable,
          nextMinPrice,
          nextSuggestedPrice,
        });
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsUpdatingPricingMode(false);
      }
    },
    [errorHandler, getValues, hasSuggestedPrice, savePricingState, setValue]
  );

  const onToggleSuggestedPrice = React.useCallback(
    async (checked: boolean) => {
      if (!isAlbumGettable || selectedPricingMode === "no-payments") {
        return;
      }

      const currentMinPrice = Number(getValues("minPrice") || 0);
      const nextSuggestedPrice = checked
        ? Math.max(
            currentMinPrice,
            Number(getValues("suggestedPrice") || 0) ||
              (currentMinPrice > 0 ? currentMinPrice : 1)
          )
        : null;

      try {
        setValue(
          "suggestedPrice",
          nextSuggestedPrice === null ? "" : `${nextSuggestedPrice}`
        );

        await savePricingState({
          isGettable: isAlbumGettable,
          nextMinPrice: currentMinPrice,
          nextSuggestedPrice,
        });
      } catch (e) {
        errorHandler(e);
      } finally {
      }
    },
    [
      errorHandler,
      getValues,
      isAlbumGettable,
      savePricingState,
      selectedPricingMode,
      setValue,
    ]
  );

  const artistHasTiersThatGrantThisAlbum =
    artist?.subscriptionTiers.filter((tier) =>
      tier.releases?.some(
        (release) => release.trackGroupId === Number(trackGroupId)
      )
    ) ?? [];

  const artistHasTiersThatGrantNewAlbums =
    artist?.subscriptionTiers.filter((tier) => tier.autoPurchaseAlbums) ?? [];

  if (!artist) {
    return null;
  }

  return (
    <FormSection>
      <h2>{t("priceAndSuch")}</h2>
      <div className="flex flex-col gap-2">
        <FormComponent>
          <label>{t("pricing")}</label>
          <div
            className={css`
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 0.75rem;
            `}
          >
            {[
              {
                key: "free-or-donate",
                label: t("pricingFreeOrDonate", {
                  currency: user?.currency
                    ? getCurrencySymbol(user?.currency)
                    : "",
                }),
              },
              { key: "paid", label: t("pricingPaid") },
              { key: "no-payments", label: t("pricingNoPayments") },
            ].map((pricing) => {
              const isSelected = selectedPricingMode === pricing.key;
              return (
                <ArtistButton
                  key={pricing.key}
                  type="button"
                  onClick={() =>
                    onSelectPricingMode(pricing.key as PricingMode)
                  }
                  disabled={isUpdatingPricingMode}
                  variant={isSelected ? "default" : "outlined"}
                >
                  {pricing.label}
                </ArtistButton>
              );
            })}
          </div>
        </FormComponent>
        <div className="w-full flex flex-col gap-2 border-1 border-(--mi-darken-x-background-color) px-4 py-3">
          <p>
            <Trans
              i18nKey="manageOnSubscription"
              t={t}
              components={{
                subscriptionLink: (
                  <ArtistRouterLink
                    to={getArtistManageTiersUrl(artist.id)}
                  ></ArtistRouterLink>
                ),
              }}
            />
          </p>

          {!isAlbumGettable && <p>{t("albumNotAvailableForPurchase")}</p>}
          {artistHasTiersThatGrantThisAlbum.length > 0 && (
            <p>
              {t("albumGrantedBySubscriptionTier", {
                tiers: artistHasTiersThatGrantThisAlbum
                  .map((tier) => tier.name)
                  .join(", "),
              })}
            </p>
          )}
          {artistHasTiersThatGrantNewAlbums.length > 0 && (
            <p>
              {t("albumGrantedToSubscriptionTiersWhenPublished", {
                tiers: artistHasTiersThatGrantNewAlbums
                  .map((tier) => tier.name)
                  .join(", "),
              })}
            </p>
          )}
        </div>
        {isAlbumGettable && (
          <div
            className={css`
              width: 100%;
              @media screen and (min-width: ${bp.medium}px) {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
              }
            `}
          >
            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <label>{t("minimumPrice")}</label>
              <small>{t("minimumPriceDescription")}</small>
              <div
                className={css`
                  display: flex;
                  align-items: center;
                `}
              >
                {user?.currency && (
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
                    {getCurrencySymbol(user?.currency)}
                  </div>
                )}
                <SavingInput
                  formKey="minPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  url={`manage/trackGroups/${trackGroupId}`}
                  extraData={{ artistId: Number(artistId) }}
                />
              </div>{" "}
              <small>{t("pricingHelp")}</small>
              {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
              <small>{t("currencyIsSetOnManageArtist")}</small>
            </FormComponent>

            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <label
                htmlFor="hasSuggestedPrice"
                className={css`
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                `}
              >
                <InputEl
                  id="hasSuggestedPrice"
                  colors={colors}
                  type="checkbox"
                  checked={hasSuggestedPrice}
                  onChange={(event) => {
                    onToggleSuggestedPrice(event.target.checked);
                  }}
                />
                {t("suggestAlternateDefaultPrice")}
              </label>

              {hasSuggestedPrice && (
                <>
                  <small>{t("suggestedPriceDescription")}</small>
                  <small>{t("suggestedPriceDescriptionClarifier")}</small>
                  <div
                    className={css`
                      display: flex;
                      align-items: center;
                    `}
                  >
                    {user?.currency && (
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
                        {getCurrencySymbol(user?.currency)}
                      </div>
                    )}
                    <SavingInput
                      formKey="suggestedPrice"
                      type="number"
                      step="0.01"
                      min={0}
                      url={`manage/trackGroups/${trackGroupId}`}
                      extraData={{ artistId: Number(artistId) }}
                    />
                  </div>
                </>
              )}
            </FormComponent>

            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <PaymentSlider
                label={t("platformPercent")}
                url={`manage/trackGroups/${trackGroupId}`}
                extraData={{ artistId: Number(artistId) }}
              />
              {errors.platformPercent && (
                <FormError>{t("platformPercent")}</FormError>
              )}
            </FormComponent>
          </div>
        )}
        {existingObject && existingObject?.tracks?.length > 0 && (
          <SetPriceOfAllTracks tracks={existingObject.tracks} reload={reload} />
        )}
      </div>
    </FormSection>
  );
};

export default PriceAndSuch;
