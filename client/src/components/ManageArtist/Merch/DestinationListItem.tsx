import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaTrash } from "react-icons/fa";

import countryCodesCurrencies from "./country-codes-currencies";

const DestinationListItem: React.FC<{
  dest: Partial<ShippingDestination>;
  index: number;
  isEditing: boolean;
  currency: string;
  onRemove: () => void;
}> = ({ dest, isEditing, index, currency, onRemove }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const methods = useFormContext();
  const { remove } = useFieldArray({
    control: methods.control,
    name: "destinations",
  });

  const allDestinations = methods.watch("destinations");
  const onlyOneDestination = allDestinations.length === 1;
  const defaultOption = onlyOneDestination
    ? t("everywhere")
    : t("everywhereElse");
  const destinationString = dest.destinationCountry
    ? dest.destinationCountry
    : defaultOption;

  const homeCountry = methods.watch(`destinations.${index}.homeCountry`);
  const idPrefix = `input-destination-${index}`;
  const homeCountryId = `${idPrefix}-home-country`;
  const destinationCountryId = `${idPrefix}-destination-country`;
  const costPerUnitId = `${idPrefix}-cost-per-unit`;
  const costPerAdditionalUnitId = `${idPrefix}-cost-per-additional-unit`;
  return (
    <li>
      {isEditing && (
        <div
          className={css`
            width: 100%;
            display: flex;
            justify-content: space-between;

            > div {
              max-width: 25%;
              display: inline-block;
              margin-right: 1rem;
            }
          `}
        >
          <FormComponent>
            <label htmlFor={homeCountryId}>{t("homeCountry")}</label>
            <SelectEl
              id={homeCountryId}
              {...methods.register(`destinations.${index}.homeCountry`)}
            >
              {countryCodesCurrencies
                .sort((a, b) => (a.countryName > b.countryName ? 1 : -1))
                .map((country) => (
                  <option key={country.countryCode} value={country.countryCode}>
                    {country.countryName} ({country.countryCode})
                  </option>
                ))}
            </SelectEl>
          </FormComponent>
          <FormComponent>
            <label htmlFor={destinationCountryId}>
              {t("destinationCountry")}
            </label>
            <SelectEl
              id={destinationCountryId}
              {...methods.register(`destinations.${index}.destinationCountry`)}
            >
              <option value="">{defaultOption}</option>
              {countryCodesCurrencies
                .sort((a, b) => (a.countryName > b.countryName ? 1 : -1))
                .map((country) => (
                  <option key={country.countryCode} value={country.countryCode}>
                    {country.countryName} ({country.countryCode})
                  </option>
                ))}
            </SelectEl>
          </FormComponent>
          <FormComponent>
            <label htmlFor={costPerUnitId}>{t("costUnit")}</label>
            <InputEl
              id={costPerUnitId}
              type="number"
              min={0}
              step={0.01}
              {...methods.register(`destinations.${index}.costUnit`)}
            />
          </FormComponent>
          <FormComponent>
            <label htmlFor={costPerAdditionalUnitId}>
              {t("costExtraUnit")}
            </label>
            <InputEl
              id={costPerAdditionalUnitId}
              type="number"
              min={0}
              step={0.01}
              {...methods.register(`destinations.${index}.costExtraUnit`)}
            />
          </FormComponent>
          <ArtistButton
            className={css`
              align-self: center;
            `}
            onClick={onRemove}
            startIcon={<FaTrash />}
          ></ArtistButton>
        </div>
      )}
      {!isEditing && (
        <>
          <em>
            {dest.homeCountry} &#x2192; {destinationString}
          </em>
          {moneyDisplay({
            amount: dest.costUnit,
            currency,
          })}{" "}
          (
          {moneyDisplay({
            amount: dest.costExtraUnit,
            currency,
          })}
          )
        </>
      )}
    </li>
  );
};

export default DestinationListItem;
