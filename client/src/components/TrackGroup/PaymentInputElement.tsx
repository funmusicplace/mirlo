import Money, {
  getCurrencySymbol,
  moneyDisplay,
} from "components/common/Money";
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
}> = ({ currency, platformPercent, minPrice, artistName }) => {
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const { register, setValue, watch } = useFormContext<FormData>();

  const chosenPrice = watch("chosenPrice");

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
      {Number(chosenPrice) > (minPrice ?? 1) * 100 && (
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
            minPrice: (minPrice ?? 100) / 100,
          })}
        </small>
      )}
      <AddMoneyValueButtons
        addMoneyAmount={addMoneyAmount}
        currency={currency}
      />
      <PlatformPercent
        percent={platformPercent}
        chosenPrice={chosenPrice}
        currency={currency}
        artistName={artistName}
      />
    </>
  );
};

export default PaymentInputElement;
