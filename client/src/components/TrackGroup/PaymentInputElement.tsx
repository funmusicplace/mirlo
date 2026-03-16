import { getCurrencySymbol, moneyDisplay } from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";

import { InputEl } from "components/common/Input";
import { useFormContext } from "react-hook-form";
import PlatformPercent from "components/common/PlatformPercent";
import Box from "components/common/Box";

import AddMoneyValueButtons from "components/common/AddMoneyValueButtons";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
  consentToStoreData: boolean;
}

const PaymentInputElement: React.FC<{
  currency: string;
  platformPercent: number;
  minPrice?: number;
  artistName?: string;
  discountPercent?: number;
}> = ({
  currency,
  platformPercent,
  minPrice,
  artistName,
  discountPercent = 0,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const { register, setValue, watch } = useFormContext<FormData>();

  const chosenPrice = watch("chosenPrice");
  const numericChosenPrice = Number(chosenPrice);
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
    <>
      {" "}
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
        <Box variant="success">
          {t("thatsGenerous", {
            chosenPrice: moneyDisplay({
              amount: chosenPrice,
              currency: currency,
            }),
          })}
        </Box>
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
          <div className="w-full align-center mt-2 rounded border p-3 text-sm bg-(--mi-primary-color) text-(--mi-normal-background-color)">
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
      <PlatformPercent
        percent={platformPercent}
        chosenPrice={finalPrice}
        currency={currency}
        artistName={artistName}
      />
    </>
  );
};

export default PaymentInputElement;
