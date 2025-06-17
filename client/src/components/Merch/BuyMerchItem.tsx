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

type FormData = {
  quantity: number;
  price: number;
  merchOptionIds: string[];
  shippingDestinationId: string;
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
  const currentOptions = methods.watch("merchOptionIds");
  const shippingDestination = methods.watch("shippingDestinationId");

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
            options.find((o) => (o?.quantityRemaining ?? 0) < data.quantity)
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

  let price = currentPrice;

  merch.shippingDestinations.forEach((sd) => {
    if (sd.id === shippingDestination) {
      price += sd.costUnit / 100 + (sd.costExtraUnit * (quantity - 1)) / 100;
    }
  });

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
            backround: blue;
            flex-direction: row;

            > div {
              max-width: 49%;
              margin-right: 1rem;
              margin-bottom: 0.5rem;
            }
          }
        `}
      >
        <FormComponent>
          <label>{t("howMany")}</label>
          <InputEl
            {...methods.register("quantity", {
              min: 1,
              max: merch.quantityRemaining,
            })}
            className={css`
              max-width: 8rem;
            `}
            type="number"
            min={1}
            max={merch.quantityRemaining}
          />
          {formState.errors.quantity && (
            <Box
              variant="warning"
              className={css`
                margin-top: 0.5rem;
              `}
              compact
            >
              {formState.errors.quantity.message}
            </Box>
          )}
        </FormComponent>
        <FormComponent>
          <label>
            {t("howMuch", { currency: getCurrencySymbol(merch.currency) })}
          </label>
          <InputEl
            {...methods.register("price", { min: minPrice })}
            type="number"
            min={minPrice ? minPrice : 0}
            step={0.01}
            className={css`
              max-width: 8rem;
            `}
          />
        </FormComponent>
      </div>

      {merch.optionTypes?.map((optionType, idx) => (
        <FormComponent>
          <label>{optionType.optionName}</label>
          <SelectEl {...methods.register(`merchOptionIds.${idx}`)} required>
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
      <FormComponent>
        <label>{t("supportedShippingDestinations")}</label>
        <SelectEl {...methods.register(`shippingDestinationId`)}>
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
              })}
              )
            </option>
          ))}
        </SelectEl>
      </FormComponent>
      <IncludesDigitalDownload merch={merch} artist={artist} />
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
      <Button
        disabled={!methods.formState.isValid}
        isLoading={isLoadingStripe}
        size="big"
        rounded
        endIcon={<FaChevronRight />}
      >
        {t("goToCheckOut")}
      </Button>
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
