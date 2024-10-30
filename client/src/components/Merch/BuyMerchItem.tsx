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
import { moneyDisplay } from "components/common/Money";
import IncludesDigitalDownload from "./IncludesDigitalDownload";

type FormData = {
  quantity: number;
  price: number;
  merchOptionIds: string[];
  shippingDestinationId: string;
};

const BuyMerchItem: React.FC<{
  merch: Merch;
  artist: Artist;
  showTitle?: boolean;
}> = ({ merch, artist, showTitle }) => {
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

  const onSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (merch) {
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
      <h3>{t("buy", { title: showTitle ? merch.title : undefined })}</h3>
      <div
        className={css`
          @media screen and (min-width: ${bp.medium}px) {
            display: flex;
            backround: blue;
            flex-direction: row;

            > div {
              max-width: 49%;
              margin-right: 1rem;
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
        </FormComponent>
        <FormComponent>
          <label>{t("howMuch", { currency: merch.currency })}</label>
          <InputEl
            {...methods.register("price", { min: minPrice })}
            type="number"
            min={minPrice}
            className={css`
              max-width: 8rem;
            `}
          />
        </FormComponent>
      </div>

      {merch.optionTypes?.map((optionType, idx) => (
        <FormComponent>
          <label>{optionType.optionName}</label>
          <SelectEl {...methods.register(`merchOptionIds.${idx}`)}>
            {optionType.options.map((o) => (
              <option key={o.name} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectEl>
        </FormComponent>
      ))}
      <FormComponent>
        <label>{t("supportedShippingDestinations")}</label>
        <SelectEl {...methods.register(`shippingDestinationId`)}>
          {merch.shippingDestinations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.destinationCountry && o.destinationCountry !== ""
                ? o.destinationCountry
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
      <Button
        disabled={!methods.formState.isValid}
        isLoading={isLoadingStripe}
        variant="big"
      >
        {t("buy")}
      </Button>
    </form>
  );
};

export default BuyMerchItem;
