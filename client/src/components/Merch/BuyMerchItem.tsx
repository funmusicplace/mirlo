import { useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch, queryUserStripeStatus } from "queries";

import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { useForm } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { css } from "@emotion/css";
import api from "services/api";

type FormData = {
  quantity: number;
  price: number;
};

function BuyMerchItem() {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });
  const [isLoadingStripe, setIsLoadingStripe] = React.useState(false);

  const { artistId, merchId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: merch, isLoading: isLoadingMerch } = useQuery(
    queryMerch({ merchId: merchId ?? "" })
  );

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const minPrice = (merch?.minPrice ?? 0) / 100;

  const methods = useForm<FormData>({
    defaultValues: { price: minPrice, quantity: 1 },
  });

  const onSubmit = React.useCallback(
    async (data: FormData) => {
      console.log(data);
      try {
        if (merch) {
          setIsLoadingStripe(true);
          const response = await api.post<{}, { redirectUrl: string }>(
            `merch/${merch.id}/purchase`,
            {
              price: data.price ? Number(data.price) * 100 : undefined,
              quantity: data.quantity,
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

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!merch && !isLoadingMerch) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!merch) {
    return <FullPageLoadingSpinner />;
  } else if (
    !stripeAccountStatus?.chargesEnabled ||
    merch.quantityRemaining === 0
  ) {
    return null;
  }

  console.log("errors", methods.formState.errors);

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <h3>{t("buy")}</h3>
      <p>{t("supportThisArtistByPurchasing")}</p>
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
        <label>{t("howMuch")}</label>
        <InputEl
          {...methods.register("price", { min: minPrice })}
          type="number"
          min={minPrice}
          className={css`
            max-width: 8rem;
          `}
        />
      </FormComponent>
      <Button disabled={!methods.formState.isValid} variant="big">
        {t("buy")}
      </Button>
    </form>
  );
}

export default BuyMerchItem;
