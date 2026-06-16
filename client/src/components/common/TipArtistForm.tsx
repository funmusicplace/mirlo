import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { queryArtist } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { getArtistUrl } from "utils/artist";

import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import { moneyDisplay } from "./Money";
import PurchaseModal from "./Purchase/PurchaseModal";
import { usePurchase } from "./Purchase/usePurchase";
import TextArea from "./TextArea";

const defaultGifts = [
  { value: 5 },
  { value: 10 },
  { value: 15 },
  { value: 25 },
  { value: "other" },
];

const TipArtistForm: React.FC<{
  artist: Pick<Artist, "id" | "name" | "userId" | "urlSlug">;
}> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { user } = useAuthContext();
  const { checkout, isLoading, startPurchase, reset } = usePurchase();

  const methods = useForm<{
    price: number;
    email: string;
    message?: string;
    priceButton: number | "other";
  }>({ defaultValues: {} });

  const { data: artistDetails } = useQuery(
    queryArtist({ artistSlug: artist.urlSlug ?? "", includeDefaultTier: true })
  );

  const currency = artistDetails?.user?.currency ?? "usd";

  const startTip = () => {
    const buttonPrice = methods.getValues("priceButton");
    const price =
      buttonPrice === "other" ? methods.getValues("price") : buttonPrice;
    if (!price) return;
    startPurchase({
      artistId: artist.id,
      items: [
        {
          type: "tip",
          amount: Math.round(Number(price) * 100),
          message: methods.getValues("message") || undefined,
        },
      ],
      email: user ? undefined : methods.getValues("email"),
    });
  };

  const value = methods.watch("price");
  const valueButton = methods.watch("priceButton");

  const actualValue = valueButton === "other" ? value : valueButton;

  return (
    <div className={css``}>
      {!artistDetails && <LoadingBlocks rows={1} />}

      {currency && artistDetails && (
        <>
          <FormProvider {...methods}>
            <ul className="flex flex-wrap justify-center gap-2">
              {defaultGifts.map((gift) => (
                <li key={gift.value} className="inline-block">
                  <input
                    type="radio"
                    className="sr-only"
                    value={gift.value}
                    {...methods.register("priceButton")}
                    id={`${artist.id}-priceButton-${gift.value}`}
                  />
                  <label
                    htmlFor={`${artist.id}-priceButton-${gift.value}`}
                    className={
                      "block p-2 mr-1 rounded-lg border text-center cursor-pointer " +
                      css`
                        border-color: var(--mi-button-color);
                        background-color: var(--mi-background-color);
                        color: var(--mi-button-color);

                        input:checked + & {
                          background-color: var(--mi-button-color);
                          color: var(--mi-button-text-color);
                        }
                      `
                    }
                  >
                    {gift.value !== "other"
                      ? moneyDisplay({
                          amount: gift.value,
                          currency,
                        })
                      : t("otherGift")}
                  </label>
                </li>
              ))}
            </ul>
            {valueButton === "other" && (
              <FormComponent
                className={css`
                  margin-bottom: 0.5rem !important;
                `}
              >
                <InputEl
                  type="number"
                  {...methods.register("price")}
                  step={0.01}
                  min={0}
                />
              </FormComponent>
            )}
            {actualValue && (
              <>
                {!user && (
                  <FormComponent
                    className={css`
                      margin-bottom: 0.5rem !important;
                    `}
                  >
                    {t("email")}
                    <InputEl
                      {...methods.register("email")}
                      type="email"
                      required
                    />
                  </FormComponent>
                )}
                <FormComponent
                  className={css`
                    margin-top: 1rem !important ;
                  `}
                >
                  <label htmlFor="comment">{t("leaveAComment")}</label>
                  <TextArea
                    id="comment"
                    {...methods.register("message")}
                    rows={2}
                  />
                </FormComponent>
                <ArtistButton
                  onClick={() => startTip()}
                  isLoading={isLoading}
                  disabled={
                    isLoading || !methods.formState.isValid || !actualValue
                  }
                  wrap
                  className={css`
                    width: 100% !important;
                  `}
                >
                  {currency &&
                    t(!actualValue ? "enterGiftAmount" : "giveOnce", {
                      amount: moneyDisplay({
                        amount: actualValue,
                        currency,
                      }),
                    })}
                </ArtistButton>
              </>
            )}
          </FormProvider>
        </>
      )}
      <PurchaseModal
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        returnUrl={`${window.location.origin}${getArtistUrl(
          artist
        )}/checkout-complete?purchaseType=tip`}
        title={t("tipArtistByName", { artistName: artist.name }) ?? ""}
        buttonLabel={t("completePayment")}
      />
    </div>
  );
};

export default TipArtistForm;
