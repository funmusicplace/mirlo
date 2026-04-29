import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import { SelectEl } from "components/common/Select";
import EmbeddedStripeForm from "components/common/stripe/EmbeddedStripe";
import TextArea from "components/common/TextArea";
import PaymentInputElement from "components/TrackGroup/PaymentInputElement";
import { flatten } from "lodash";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

import BuyMerchItemDestinations from "./BuyMerchItemDestinations";
import IncludesDigitalDownload from "./IncludesDigitalDownload";

export type BuyMerchFormData = {
  quantity: number;
  chosenPrice: number;
  merchOptionIds: string[];
  shippingDestinationId: string;
  message?: string;
};

const BuyMerchItem: React.FC<{
  merch: Merch;
  artist: Artist;
  showTitle?: boolean;
}> = ({ merch, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });
  const snackbar = useSnackbar();
  const [isLoadingStripe, setIsLoadingStripe] = React.useState(false);

  const paymentUserId = artist.paymentToUserId ?? artist.userId;
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(paymentUserId)
  );

  const minPrice = (merch?.minPrice ?? 0) / 100;

  const methods = useForm<BuyMerchFormData>({
    defaultValues: {
      chosenPrice: minPrice,
      quantity: 1,
      merchOptionIds: [],
    },
  });

  const { formState, setError } = methods;

  const currentPrice = methods.watch("chosenPrice");
  const quantity = methods.watch("quantity");
  const shippingDestination = methods.watch("shippingDestinationId");
  const merchOptionIds = methods.watch("merchOptionIds");
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [onComplete, setOnComplete] = React.useState<(() => void) | undefined>(
    undefined
  );

  const onSubmit = React.useCallback(
    async (data: BuyMerchFormData) => {
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
          const response = await api.post<
            {},
            { redirectUrl: string; clientSecret: string }
          >(`merch/${merch.id}/purchase`, {
            price: data.chosenPrice
              ? Number(data.chosenPrice) * 100
              : undefined,
            quantity: data.quantity,
            merchOptionIds: data.merchOptionIds,
            shippingDestinationId: data.shippingDestinationId,
            message: data.message,
          });
          if (response.clientSecret) {
            const artistSlug = artist.urlSlug ?? artist.id;
            const params = new URLSearchParams();
            params.set("purchaseType", "merch");
            params.set("merchId", merch.id);
            setOnComplete(
              () => () =>
                navigate(
                  `/${artistSlug}/checkout-complete?${params.toString()}`
                )
            );
            setClientSecret(response.clientSecret);
          } else {
            window.location.assign(response.redirectUrl);
          }
          setIsLoadingStripe(false);
        }
      } catch (e) {
        setIsLoadingStripe(false);
        snackbar(t("errorOccurred"), {
          type: "warning",
        });
      }
    },
    [setIsLoadingStripe, merch?.id]
  );

  if (!stripeAccountStatus?.chargesEnabled || merch.quantityRemaining === 0) {
    return null;
  }

  let price = Number(currentPrice * quantity);
  let amountAvailable = merch.quantityRemaining;

  merch.optionTypes?.forEach((ot) => {
    ot.options.forEach((o) => {
      if (merchOptionIds.includes(o.id)) {
        price += (o.additionalPrice * Number(quantity)) / 100;
        if (o.quantityRemaining !== null && o.quantityRemaining !== undefined) {
          amountAvailable = Math.min(o.quantityRemaining ?? 0, amountAvailable);
        }
      }
    });
  });

  merch.shippingDestinations.forEach((sd) => {
    if (sd.id === shippingDestination) {
      const otherUnitCount = Number(quantity) - 1;
      const costUnit = sd.costUnit / 100;
      const costExtraUnit = (sd.costExtraUnit * otherUnitCount) / 100;

      price += costUnit + costExtraUnit;
    }
  });

  const exceedsAvailable = Number.isFinite(amountAvailable)
    ? amountAvailable < Number(quantity)
    : false;

  if (clientSecret && stripeAccountStatus?.stripeAccountId) {
    return (
      <EmbeddedStripeForm
        clientSecret={clientSecret}
        stripeAccountId={stripeAccountStatus.stripeAccountId}
        onComplete={onComplete}
      />
    );
  }

  return (
    <FormProvider {...methods}>
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
              margin-bottom: 0.25rem;
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
        </div>
        <FormComponent>
          <PaymentInputElement
            currency={merch.currency}
            platformPercent={artist.defaultPlatformFee ?? 0}
            artistName={artist.name}
            minPrice={minPrice * 100}
            artistId={artist.id}
          />
        </FormComponent>
        <div
          className={
            "mt-2 pb-2 mb-2 " +
            css`
              @media screen and (min-width: ${bp.medium}px) {
                display: flex;
                flex-direction: row;
              }

              border-bottom: 1px solid var(--mi-tint-x-color);
              > div {
                width: 49%;
                margin-right: 1rem;
              }
            `
          }
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
        <BuyMerchItemDestinations merch={merch} />
        <div
          className={css`
            border-bottom: 1px solid var(--mi-tint-x-color);
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
              amount: moneyDisplay({
                amount: price,
                currency: merch.currency,
              }),
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
    </FormProvider>
  );
};

export default BuyMerchItem;
