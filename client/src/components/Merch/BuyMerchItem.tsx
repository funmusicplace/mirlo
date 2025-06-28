import { useTranslation } from "react-i18next";

import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";
import { bp } from "../../constants";

import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { useForm } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { css } from "@emotion/css";
import api from "services/api";
import { SelectEl } from "components/common/Select";
import { getCurrencySymbol, moneyDisplay } from "components/common/Money";
import IncludesDigitalDownload from "./IncludesDigitalDownload";
import { FaChevronRight } from "react-icons/fa";
import countryCodesCurrencies from "components/ManageArtist/Merch/country-codes-currencies";
import { flatten } from "lodash";
import Box from "components/common/Box";
import TextArea from "components/common/TextArea";

type FormData = {
  quantity: number;
  price: number;
  merchOptionIds: string[];
  shippingDestinationId: string;
  message?: string;
};

const codeToCountryMap = countryCodesCurrencies.reduce(
  (aggr, country) => {
    aggr[country.countryCode] = country;
    return aggr;
  },
  {} as { [key: string]: any }
);

const BuyMerchItem: React.FC<{
  merch: Merch;
  artist: Artist;
  showTitle?: boolean;
}> = ({ merch, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });
  const [isLoadingStripe, setIsLoadingStripe] = React.useState(false);

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const minPrice = (merch?.minPrice ?? 0) / 100;

  const methods = useForm<FormData>({
    defaultValues: {
      price: minPrice,
      quantity: 1,
      merchOptionIds: [],
    },
  });

  const { formState, setError } = methods;

  const currentPrice = methods.watch("price");
  const quantity = methods.watch("quantity");
  const shippingDestination = methods.watch("shippingDestinationId");
  const merchOptionIds = methods.watch("merchOptionIds");

  const onSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (merch) {
          const options = flatten(
            merch.optionTypes?.map((ot) =>
              ot.options.find((o) => data.merchOptionIds.includes(o.id))
            )
          );

          if (
            options &&
            options.find(
              (o) =>
                o &&
                o.quantityRemaining !== undefined &&
                o.quantityRemaining !== null &&
                o.quantityRemaining < data.quantity
            )
          ) {
            setError("merchOptionIds", {
              type: "manual",
              message: t("notEnoughInStockQuantity") ?? "",
            });
            return;
          }
          if (data.quantity < 1 || data.quantity > merch.quantityRemaining) {
            setError("quantity", {
              type: "manual",
              message: t("notEnoughInStockCategory") ?? "",
            });
            return;
          }
          setIsLoadingStripe(true);
          const response = await api.post<{}, { redirectUrl: string }>(
            `merch/${merch.id}/purchase`,
            {
              price: data.price ? Number(data.price) * 100 : undefined,
              quantity: data.quantity,
              merchOptionIds: data.merchOptionIds,
              shippingDestinationId: data.shippingDestinationId,
              message: data.message,
            }
          );
          window.location.assign(response.redirectUrl);
          setIsLoadingStripe(false);
        }
      } catch (e) {
        setIsLoadingStripe(false);
      }
    },
    [setIsLoadingStripe, merch?.id]
  );

  if (!stripeAccountStatus?.chargesEnabled || merch.quantityRemaining === 0) {
    return null;
  }

  let price = Number(currentPrice) * Number(quantity);
  let amountAvailable = merch.quantityRemaining;

  merch.shippingDestinations.forEach((sd) => {
    if (sd.id === shippingDestination) {
      const otherUnitCount = Number(quantity) - 1;
      const costUnit = sd.costUnit / 100;
      const costExtraUnit = (sd.costExtraUnit * otherUnitCount) / 100;

      price += costUnit + costExtraUnit;
    }
  });

  merch.optionTypes.forEach((ot) => {
    ot.options.forEach((o) => {
      if (merchOptionIds.includes(o.id)) {
        price += (o.additionalPrice * Number(quantity)) / 100;
        if (o.quantityRemaining !== null && o.quantityRemaining !== undefined) {
          amountAvailable = Math.min(o.quantityRemaining ?? 0, amountAvailable);
        }
      }
    });
  });
  console.log("amountAvailable", amountAvailable, quantity);
  console.log("formState", formState.errors);
  const exceedsAvailable = amountAvailable < Number(quantity);

  const onlyOneDestination = merch.shippingDestinations.length === 1;
  const defaultOption = onlyOneDestination
    ? t("everywhere")
    : t("everywhereElse");

  return (
    <form
      onSubmit={methods.handleSubmit(onSubmit)}
      className={css`
        padding: 1rem;
        margin-top: -1rem;
      `}
    >
      <div
        className={css`
          @media screen and (min-width: ${bp.medium}px) {
            display: flex;
            flex-direction: row;
          }

          > div {
            width: 49%;
            margin-right: 1rem;
          }
        `}
      >
        <FormComponent>
          <label htmlFor="quantity">{t("howMany")}</label>
          <InputEl
            {...methods.register("quantity", {
              min: 1,
              max: merch.quantityRemaining,
            })}
            id="quantity"
            type="number"
            min={1}
            max={merch.quantityRemaining}
          />
          {formState.errors.quantity && (
            <Box variant="warning" compact>
              {formState.errors.quantity.message}
            </Box>
          )}
          {exceedsAvailable && (
            <Box variant="warning" compact>
              {t("notEnoughInStockQuantity")}
            </Box>
          )}
        </FormComponent>
        <FormComponent>
          <label htmlFor="price">
            {t("howMuch", { currency: getCurrencySymbol(merch.currency) })}
          </label>
          <InputEl
            {...methods.register("price", { min: minPrice })}
            type="number"
            id="price"
            min={minPrice ? minPrice : 0}
            step={0.01}
          />
          {price < minPrice && (
            <Box variant="warning" compact>
              {t("priceMustBeAtLeast", {
                price: moneyDisplay({
                  amount: minPrice,
                  currency: merch.currency,
                }),
              })}
            </Box>
          )}
        </FormComponent>
      </div>
      <div
        className={css`
          @media screen and (min-width: ${bp.medium}px) {
            display: flex;
            flex-direction: row;
          }
          padding-bottom: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--mi-darken-x-background-color);
          > div {
            width: 49%;
            margin-right: 1rem;
          }
        `}
      >
        {merch.optionTypes?.map((optionType, idx) => (
          <FormComponent>
            <label htmlFor={`merchOptionIds.${idx}`}>
              {optionType.optionName}
            </label>
            <SelectEl
              id={`merchOptionIds.${idx}`}
              {...methods.register(`merchOptionIds.${idx}`)}
              required
            >
              <option value="">{t("choose")}</option>

              {optionType.options
                .sort((a, b) => {
                  return a.additionalPrice < b.additionalPrice ? -1 : 1;
                })
                .map((o) => (
                  <option
                    key={o.name}
                    value={o.id}
                    disabled={
                      o.quantityRemaining !== null
                        ? o.quantityRemaining < quantity
                        : false
                    }
                  >
                    {o.additionalPrice
                      ? t("option", {
                          name: o.name,
                          costUnit: moneyDisplay({
                            amount: o.additionalPrice / 100,
                            currency: merch.currency,
                          }),
                        })
                      : o.name}
                  </option>
                ))}
            </SelectEl>
            {formState.errors.merchOptionIds && (
              <Box
                variant="warning"
                className={css`
                  margin-top: 0.5rem;
                `}
                compact
              >
                {formState.errors.merchOptionIds.message}
              </Box>
            )}
          </FormComponent>
        ))}
      </div>
      <FormComponent
        className={css`
          padding-bottom: 2rem;
          margin-bottom: 2rem !important;
          border-bottom: 1px solid var(--mi-darken-x-background-color);
        `}
      >
        <label htmlFor="shippingDestinationId">
          {t("supportedShippingDestinations")}
        </label>
        <SelectEl
          id="shippingDestinationId"
          {...methods.register(`shippingDestinationId`)}
        >
          {merch.shippingDestinations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.destinationCountry && o.destinationCountry !== ""
                ? `${codeToCountryMap[o.destinationCountry].countryName} (${o.destinationCountry})`
                : defaultOption}{" "}
              (
              {t("destinationCost", {
                costUnit: moneyDisplay({
                  amount: o.costUnit / 100,
                  currency: o.currency,
                }),
                costExtraUnit: moneyDisplay({
                  amount: o.costExtraUnit / 100,
                  currency: o.currency,
                }),
              })}
              )
            </option>
          ))}
        </SelectEl>
      </FormComponent>
      <div
        className={css`
          border-bottom: 1px solid var(--mi-darken-x-background-color);
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        `}
      >
        <p
          className={css`
            margin: 1rem auto;
            font-weight: bold;
          `}
        >
          {t("orderTotal", {
            amount: moneyDisplay({ amount: price, currency: merch.currency }),
          })}
        </p>
        <IncludesDigitalDownload merch={merch} artist={artist} />
      </div>

      <FormComponent>
        <label htmlFor="comment">{t("leaveAComment")}</label>
        <TextArea id="comment" {...methods.register("message")} rows={2} />
        <small>{t("messageToArtist")}</small>
      </FormComponent>

      <div
        className={css`
          display: flex;
          justify-content: flex-end;
          margin-bottom: 2rem;
        `}
      >
        <Button
          disabled={!methods.formState.isValid || exceedsAvailable}
          isLoading={isLoadingStripe}
          size="big"
          rounded
          endIcon={<FaChevronRight />}
        >
          {t("goToCheckOut")}
        </Button>
      </div>
      <div
        className={css`
          margin-top: 1rem;
        `}
      >
        <small>{t("artistCheckoutPage")}</small>
      </div>
    </form>
  );
};

export default BuyMerchItem;
