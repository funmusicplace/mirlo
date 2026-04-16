import { getCurrencySymbol, moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";

import { InputEl } from "components/common/Input";
import { useFormContext } from "react-hook-form";
import PlatformPercent from "components/common/PlatformPercent";
import Box from "components/common/Box";

import AddMoneyValueButtons from "components/common/AddMoneyValueButtons";
import { useAuthContext } from "state/AuthContext";
import { useGetArtistColors } from "components/Artist/ArtistButtons";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
  consentToStoreData: boolean;
}

const PaymentInputElement: React.FC<{
  currency: string;
  isDigital?: boolean;
  platformPercent: number;
  minPrice?: number; // in cents
  artistName?: string;
  artistId?: number;
}> = ({
  currency,
  isDigital,
  platformPercent,
  minPrice,
  artistName,
  artistId,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const colors = useGetArtistColors();
  const { register, setValue, watch } = useFormContext<FormData>();

  const chosenPrice = watch("chosenPrice");
  const numericChosenPrice = Number(chosenPrice);
  const { user } = useAuthContext();
  const activeSubscriptionForArtist = user?.artistUserSubscriptions?.find(
    (subscription) => subscription.artistSubscriptionTier.artistId === artistId
  );

  const discountPercent =
    activeSubscriptionForArtist?.artistSubscriptionTier[
      isDigital ? "digitalDiscountPercent" : "merchDiscountPercent"
    ] ?? 0;
  const normalizedDiscountPercent = Math.min(
    100,
    Math.max(0, Number(discountPercent) || 0)
  );
  const discountAmount =
    isFinite(numericChosenPrice) &&
    numericChosenPrice > 0 &&
    normalizedDiscountPercent > 0
      ? (numericChosenPrice * normalizedDiscountPercent) / 100
      : 0;
  const finalPrice =
    isFinite(numericChosenPrice) && normalizedDiscountPercent > 0
      ? Math.max(0, numericChosenPrice - discountAmount)
      : numericChosenPrice;

  const addMoneyAmount = (val: number) => {
    const currentPrice = Number(chosenPrice || 0);
    const newPrice = currentPrice + val;
    setValue("chosenPrice", newPrice.toString());
  };

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const showGenerous =
    isFinite(+chosenPrice) &&
    Number(chosenPrice) > ((minPrice || 200) / 100) * 10;

  return (
    <div className="relative pt-1">
      <label htmlFor="priceInput">
        {t("nameYourPrice", {
          currency: getCurrencySymbol(currency, undefined),
        })}{" "}
      </label>
      <InputEl
        {...register("chosenPrice")}
        type="number"
        min={minPrice ? minPrice / 100 : 0}
        step="0.01"
        id="priceInput"
      />
      {showGenerous && (
        <span className="ml-2 text-sm text-green-600">
          {t("thatsGenerous", {
            chosenPrice: moneyDisplay({
              amount: chosenPrice,
              currency: currency,
            }),
          })}
        </span>
      )}
      {lessThanMin && (
        <small>
          {t("pleaseEnterMoreThan", {
            minPrice: moneyDisplay({
              amount: (minPrice ?? 100) / 100,
              currency,
            }),
          })}
        </small>
      )}
      <AddMoneyValueButtons
        addMoneyAmount={addMoneyAmount}
        currency={currency}
      />
      {isFinite(numericChosenPrice) &&
        numericChosenPrice > 0 &&
        normalizedDiscountPercent > 0 && (
          <div
            className={`w-full align-center mt-2 rounded border p-3 text-sm border-[${colors.colors?.primary ?? "--mi-primary-color"}]`}
          >
            {t("discountSummary", {
              discountPercent: normalizedDiscountPercent,
              discountAmount: moneyDisplay({
                amount: discountAmount,
                currency,
              }),
              finalPrice: moneyDisplay({ amount: finalPrice, currency }),
            })}
          </div>
        )}
      <div className="absolute right-0 top-0">
        <PlatformPercent
          percent={platformPercent}
          chosenPrice={finalPrice ?? 0}
          currency={currency}
          artistName={artistName}
          alignRight
        />
      </div>
    </div>
  );
};

export default PaymentInputElement;
