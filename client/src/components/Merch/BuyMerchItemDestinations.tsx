import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { moneyDisplay } from "components/common/Money";
import { SelectEl } from "components/common/Select";
import countryCodesCurrencies from "components/ManageArtist/Merch/country-codes-currencies";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BuyMerchFormData } from "./BuyMerchItem";

const codeToCountryMap = countryCodesCurrencies.reduce(
  (aggr, country) => {
    aggr[country.countryCode] = country;
    return aggr;
  },
  {} as { [key: string]: any }
);

const BuyMerchItem: React.FC<{ merch: Merch }> = ({ merch }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const methods = useFormContext<BuyMerchFormData>();

  const shippingDestination = methods.watch("shippingDestinationId");

  let destinations = merch.shippingDestinations;
  const includesEU = destinations.find(
    (sd) => sd.destinationCountry?.toLowerCase() === "eu"
  );

  if (includesEU) {
    // if we ship to EU, we ship everywhere in EU
    destinations.push(
      ...countryCodesCurrencies
        .filter(
          (c) =>
            c.isEU &&
            !destinations.find((d) => d.destinationCountry === c.countryCode)
        )
        .map((c) => ({
          ...includesEU,
          id: c.countryCode,
          destinationCountry: c.countryCode,
          costUnit: includesEU.costUnit,
          costExtraUnit: includesEU.costExtraUnit,
        }))
    );
    destinations = destinations.filter(
      (sd) => sd.destinationCountry?.toLowerCase() !== "eu"
    );
  }

  const onlyOneDestination = destinations.length === 1;
  const defaultOption = onlyOneDestination
    ? t("everywhere")
    : t("everywhereElse");

  const currentDestination = destinations.find(
    (sd) => sd.id === shippingDestination
  );

  return (
    <FormComponent
      className={css`
        padding-bottom: 2rem;
        margin-bottom: 2rem !important;
        border-bottom: 1px solid var(--mi-tint-x-color);
      `}
    >
      <label htmlFor="shippingDestinationId">
        {t("supportedShippingDestinations")}
      </label>
      <SelectEl
        id="shippingDestinationId"
        {...methods.register(`shippingDestinationId`)}
      >
        {destinations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.destinationCountry && o.destinationCountry !== ""
              ? `${codeToCountryMap[o.destinationCountry].countryName} (${o.destinationCountry})`
              : defaultOption}{" "}
          </option>
        ))}
      </SelectEl>
      {currentDestination && (
        <small>
          {t("destinationCost", {
            costUnit: moneyDisplay({
              amount: currentDestination.costUnit / 100,
              currency: merch.currency,
            }),
            costExtraUnit: moneyDisplay({
              amount: currentDestination.costExtraUnit / 100,
              currency: merch.currency,
            }),
          })}
        </small>
      )}
    </FormComponent>
  );
};

export default BuyMerchItem;
