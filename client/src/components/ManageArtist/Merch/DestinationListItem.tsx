import { moneyDisplay } from "components/common/Money";
import { css } from "@emotion/css";
import React from "react";
import { useFormContext } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import { useTranslation } from "react-i18next";
import { SelectEl } from "components/common/Select";
import countryCodesCurrencies from "./country-codes-currencies";
import { InputEl } from "components/common/Input";

const DestinationListItem: React.FC<{
  dest: Partial<ShippingDestination>;
  index: number;
  isEditing: boolean;
}> = ({ dest, isEditing, index }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const methods = useFormContext();

  const allDestinations = methods.watch("destinations");
  const onlyOneDestination = allDestinations.length === 1;
  const defaultOption = onlyOneDestination
    ? t("everywhere")
    : t("everywhereElse");
  const destinationString = dest.destinationCountry
    ? dest.destinationCountry
    : defaultOption;

  return (
    <li>
      {isEditing && (
        <div
          className={css`
            width: 100%;

            > div {
              max-width: 45%;
              display: inline-block;
              margin-right: 1rem;
            }
          `}
        >
          <FormComponent>
            <label>{t("destinationCountry")}</label>
            <SelectEl
              {...methods.register(`destinations.${index}.destinationCountry`)}
            >
              <option value="">{defaultOption}</option>
              {countryCodesCurrencies.map((country) => (
                <option key={country.countryCode} value={country.countryCode}>
                  {country.countryName} {country.countryCode}
                </option>
              ))}
            </SelectEl>
          </FormComponent>
          <FormComponent>
            <label>{t("costUnit")}</label>
            <InputEl
              type="number"
              {...methods.register(`destinations.${index}.costUnit`)}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("costExtraUnit")}</label>
            <InputEl
              type="number"
              {...methods.register(`destinations.${index}.costExtraUnit`)}
            />
          </FormComponent>
        </div>
      )}
      {!isEditing && (
        <>
          <em>
            {dest.homeCountry} -&gt; {destinationString}
          </em>
          {dest.currency && (
            <>
              {moneyDisplay({
                amount: dest.costUnit,
                currency: dest.currency,
              })}{" "}
              (
              {moneyDisplay({
                amount: dest.costExtraUnit,
                currency: dest.currency,
              })}
              )
            </>
          )}
        </>
      )}
    </li>
  );
};

export default DestinationListItem;
