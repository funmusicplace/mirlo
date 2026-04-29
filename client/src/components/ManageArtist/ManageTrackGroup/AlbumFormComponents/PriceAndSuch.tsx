import { css } from "@emotion/css";
import ArtistRouterLink, {
  ArtistButton,
} from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import FormError from "components/common/FormError";
import { InputEl } from "components/common/Input";
import { getCurrencySymbol } from "components/common/Money";
import { FormSection } from "components/ManageArtist/ManageTrackGroup/ManageTrackGroup";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { getArtistManageTiersUrl } from "utils/artist";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { bp } from "../../../../constants";
import { TrackGroupFormData } from "../ManageTrackGroup";
import SetPriceOfAllTracks from "../SetPriceOfAllTracks";

import PaymentSlider from "./PaymentSlider";
import SavingInput from "./SavingInput";

type PricingMode = "free-or-donate" | "paid" | "no-payments";

const PriceAndSuch: React.FC<{
  existingObject: TrackGroup;
  reload: () => void;
}> = ({ existingObject, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { artistId, trackGroupId } = useParams();
  const { data: artist } = useManagedArtistQuery();
  const errorHandler = useErrorHandler();
  const {
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useFormContext<TrackGroupFormData>();
  const { user } = useAuthContext();
  const [isUpdatingPricingMode, setIsUpdatingPricingMode] =
    React.useState(false);
  const pricingModeInputRefs: {
    [K in PricingMode]: React.RefObject<HTMLInputElement>;
  } = {
    "free-or-donate": React.useRef<HTMLInputElement>(null),
    paid: React.useRef<HTMLInputElement>(null),
    "no-payments": React.useRef<HTMLInputElement>(null),
  };

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

  const [didUpdatePricingMode, setDidUpdatePricingMode] = React.useState(false);

  // Restore focus to selected input after disabling and re-enabling
  React.useEffect(() => {
    if (isUpdatingPricingMode) {
      setDidUpdatePricingMode(true);
    } else if (!isUpdatingPricingMode && didUpdatePricingMode) {
      pricingModeInputRefs[selectedPricingMode].current?.focus();
      setDidUpdatePricingMode(false);
    }
  }, [
    isUpdatingPricingMode,
    didUpdatePricingMode,
    pricingModeInputRefs["free-or-donate"].current,
    pricingModeInputRefs["paid"].current,
    pricingModeInputRefs["no-payments"].current,
    selectedPricingMode,
  ]);

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
      <h2 id="label-pricing">{t("priceAndSuch")}</h2>
      <div className="flex flex-col gap-2">
        <FormComponent>
          <div
            aria-labelledby="label-pricing"
            className={css`
              display: flex;

              & input:focus-visible + label > button {
                outline: 5px auto Highlight;
                outline: 5px auto -webkit-focus-ring-color;
              }

              & label:first-of-type > button {
                border-start-end-radius: 0;
                border-end-end-radius: 0;
              }

              & label ~ label > button {
                border-radius: 0;
              }

              & label:last-of-type > button {
                border-start-end-radius: var(--mi-border-radius);
                border-end-end-radius: var(--mi-border-radius);
              }
            `}
            role="group"
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
              const id = `pricing-${pricing.key}`;
              return (
                <React.Fragment key={pricing.key}>
                  <input
                    checked={isSelected}
                    className="sr-only"
                    disabled={isUpdatingPricingMode}
                    id={id}
                    name="pricing"
                    onChange={() =>
                      onSelectPricingMode(pricing.key as PricingMode)
                    }
                    ref={pricingModeInputRefs[pricing.key as PricingMode]}
                    type="radio"
                  />
                  <label htmlFor={id}>
                    <ArtistButton
                      onClick={() =>
                        onSelectPricingMode(pricing.key as PricingMode)
                      }
                      tabIndex={-1}
                      type="button"
                      variant={isSelected ? "default" : "outlined"}
                    >
                      {pricing.label}
                    </ArtistButton>
                  </label>
                </React.Fragment>
              );
            })}
          </div>
        </FormComponent>
        <div className="w-full flex flex-col gap-2 border-1 border-(--mi-tint-x-color) px-4 py-3">
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
              <label htmlFor="input-minimum-price">{t("minimumPrice")}</label>
              <small id="description-minimum-price">
                {t("minimumPriceDescription")}
              </small>
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
                    id="unit-minimum-price"
                  >
                    {getCurrencySymbol(user?.currency)}
                  </div>
                )}
                <SavingInput
                  ariaDescribedBy="unit-minimum-price description-minimum-price hint-minimum-price-access hint-minimum-price-currency"
                  formKey="minPrice"
                  id="input-minimum-price"
                  type="number"
                  step="0.01"
                  min={0}
                  url={`manage/trackGroups/${trackGroupId}`}
                  extraData={{ artistId: Number(artistId) }}
                />
              </div>
              <small id="hint-minimum-price-access">{t("pricingHelp")}</small>
              {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
              <small id="hint-minimum-price-currency">
                {t("currencyIsSetOnManageArtist")}
              </small>
            </FormComponent>

            <FormComponent className="grow">
              <div className="flex items-center gap-1">
                <InputEl
                  aria-describedby="hint-has-suggested-price hint-has-suggested-price-clarifier"
                  id="input-has-suggested-price"
                  type="checkbox"
                  checked={hasSuggestedPrice}
                  onChange={(event) => {
                    onToggleSuggestedPrice(event.target.checked);
                  }}
                />
                <label
                  htmlFor="input-has-suggested-price"
                  id="label-has-suggested-price"
                >
                  {t("suggestAlternateDefaultPrice")}
                </label>
              </div>

              {hasSuggestedPrice && (
                <>
                  <small id="hint-has-suggested-price">
                    {t("suggestedPriceDescription")}
                  </small>
                  <small id="hint-has-suggested-price-clarifier">
                    {t("suggestedPriceDescriptionClarifier")}
                  </small>
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
                        id="unit-suggested-price"
                      >
                        {getCurrencySymbol(user?.currency)}
                      </div>
                    )}
                    <SavingInput
                      ariaDescribedBy="unit-suggested-price"
                      ariaLabelledBy="label-has-suggested-price"
                      formKey="suggestedPrice"
                      id="input-suggested-price"
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
        {existingObject &&
          existingObject?.tracks?.length > 0 &&
          selectedPricingMode !== "no-payments" && (
            <SetPriceOfAllTracks
              tracks={existingObject.tracks}
              reload={reload}
            />
          )}
      </div>
    </FormSection>
  );
};

export default PriceAndSuch;
