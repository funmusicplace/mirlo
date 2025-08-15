import { FormProvider, useForm } from "react-hook-form";
import FormComponent from "./FormComponent";
import { InputEl } from "./Input";
import { useAuthContext } from "state/AuthContext";
import Button from "./Button";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import api from "services/api";
import { moneyDisplay } from "./Money";
import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import TextArea from "./TextArea";
import useErrorHandler from "services/useErrorHandler";

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
  const errorHandler = useErrorHandler();

  const { user, refreshLoggedInUser } = useAuthContext();
  const [isCheckingForSubscription, setIsCheckingForSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();

  const methods = useForm<{
    price: number;
    email: string;
    message?: string;
    priceButton: number | "other";
  }>({ defaultValues: {} });

  const { data: artistDetails } = useQuery(
    queryArtist({ artistSlug: artist.urlSlug ?? "", includeDefaultTier: true })
  );

  const currency = artistDetails?.user?.currency;

  const subscribeToTier = async () => {
    try {
      if (artistDetails) {
        setIsCheckingForSubscription(true);
        const buttonPrice = methods.getValues("priceButton");
        const price =
          buttonPrice === "other" ? methods.getValues("price") : buttonPrice;
        const email = methods.getValues("email");
        const response = await api.post<
          { price: number; email: string; message?: string },
          { redirectUrl: string }
        >(`artists/${artistDetails.id}/tip`, {
          price: Number(price) * 100,
          email,
          message: methods.getValues("message"),
        });
        window.location.assign(response.redirectUrl);
        if (!user) {
          snackbar(t("verificationEmailSent"), { type: "success" });
        }
      }
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsCheckingForSubscription(false);
      refreshLoggedInUser();
    }
  };

  const value = methods.watch("price");
  const valueButton = methods.watch("priceButton");

  const actualValue = valueButton === "other" ? value : valueButton;

  return (
    <div
      className={css`
        margin-top: 2rem;
      `}
    >
      <p
        className={css`
          margin-bottom: 0.5rem;
        `}
      >
        {t("orGiveOnce")}
      </p>
      {!artistDetails && <LoadingBlocks rows={1} />}

      {currency && artistDetails && (
        <>
          <FormProvider {...methods}>
            <ul
              className={css`
                margin-bottom: 0.5rem;
              `}
            >
              {defaultGifts.map((gift) => (
                <li
                  key={gift.value}
                  className={css`
                    display: inline-block;

                    input {
                      display: none;
                    }

                    label {
                      padding: 0.75rem 1rem;
                      display: block;
                      border: 1px solid var(--mi-darken-background-color);
                      margin-right: 0.2rem;
                      background-color: var(--mi-lighten-background-color);
                      cursor: pointer;
                    }

                    input:checked + label {
                      background-color: var(--mi-info-background-color);
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={gift.value}
                    {...methods.register("priceButton")}
                    id={`priceButton-${gift.value}`}
                  />
                  <label htmlFor={`priceButton-${gift.value}`}>
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
            {!user && (
              <FormComponent
                className={css`
                  margin-bottom: 0.5rem !important;
                `}
              >
                {t("email")}
                <InputEl {...methods.register("email")} type="email" required />
              </FormComponent>
            )}
          </FormProvider>
          <FormComponent>
            <label htmlFor="comment">{t("leaveAComment")}</label>
            <TextArea id="comment" {...methods.register("message")} rows={2} />
            <small>{t("messageToArtist")}</small>
          </FormComponent>
          <Button
            onClick={() => subscribeToTier()}
            isLoading={isCheckingForSubscription}
            disabled={!methods.formState.isValid || !actualValue}
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
          </Button>
        </>
      )}
    </div>
  );
};

export default TipArtistForm;
