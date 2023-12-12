import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useSnackbar } from "state/SnackbarContext";

type Form = { country: string };

const CountrySelect = () => {
  const { state, refreshLoggedInUser } = useGlobalStateContext();
  const userId = state.user?.id;

  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const snackbar = useSnackbar();

  const { register, handleSubmit } = useForm<Form>({
    defaultValues: {
      country: state.user?.country,
    },
  });

  const doSave = React.useCallback(
    async (data: Form) => {
      try {
        await api.put(`users/${userId}`, {
          country: data.country,
        });
        snackbar(t("success"), { type: "success" });
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      } finally {
        refreshLoggedInUser();
      }
    },
    [refreshLoggedInUser, snackbar, t, userId]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <FormComponent
        className={css`
          * {
            margin-top: 0.5rem;
          }
          button {
            height: 2.4rem;
            margin-left: 0.5rem;
          }
        `}
      >
        <label>{t("countryCurrencyCode")} </label>
        <div>
          <SelectEl {...register("country")}>
            {stripeCountryCodes.map((cc) => (
              <option value={cc} key={cc}>
                {cc}
              </option>
            ))}
          </SelectEl>
          <Button compact>{t("saveCountryCode")}</Button>
        </div>
      </FormComponent>
    </form>
  );
};

const stripeCountryCodes = [
  "USD",
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JMD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KRW",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "STD",
  "SZL",
  "THB",
  "TJS",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "UYU",
  "UZS",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
];

export default CountrySelect;
