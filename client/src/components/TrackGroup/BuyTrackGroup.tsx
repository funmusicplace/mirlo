import Money, {
  getCurrencySymbol,
  moneyDisplay,
} from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

import { InputEl } from "components/common/Input";
import FreeDownload from "./FreeDownload";
import FormComponent from "components/common/FormComponent";
import { FormProvider, useForm } from "react-hook-form";
import EmailInput from "./EmailInput";
import PlatformPercent from "components/common/PlatformPercent";
import { css } from "@emotion/css";
import { testOwnership } from "./utils";
import Box from "components/common/Box";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { useAuthContext } from "state/AuthContext";

interface FormData {
  chosenPrice: string;
  userEmail: string;
}

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;
let stripePromise: ReturnType<typeof loadStripe> | undefined;
if (stripeKey) {
  stripePromise = loadStripe(stripeKey);
}
const BuyTrackGroup: React.FC<{ trackGroup: TrackGroup; track?: Track }> = ({
  trackGroup,
  track,
}) => {
  const snackbar = useSnackbar();
  const [stripeLoading, setStripeLoading] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();
  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${minPrice ? minPrice / 100 : ""}`,
      userEmail: "",
    },
    reValidateMode: "onChange",
  });
  const { register, watch, handleSubmit, formState } = methods;
  const chosenPrice = watch("chosenPrice");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        setStripeLoading(true);
        const alreadyOwns = await testOwnership(trackGroup.id, data.userEmail);
        const confirmed = alreadyOwns
          ? window.confirm(t("albumExists") ?? "")
          : true;

        if (confirmed) {
          const url = track
            ? `tracks/${track.id}/purchase`
            : `trackGroups/${trackGroup.id}/purchase`;
          const response = await api.post<
            {},
            { redirectUrl: string; clientSecret: string }
          >(url, {
            price: data.chosenPrice
              ? Number(data.chosenPrice) * 100
              : undefined,
            email: data.userEmail,
          });
          console.log("response", response.clientSecret);
          setClientSecret(response.clientSecret);
          // window.location.assign(response.redirectUrl);
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
        setStripeLoading(false);
      }
    },
    [snackbar, t, trackGroup.id, track]
  );

  const lessThan1 = !isFinite(+chosenPrice) ? true : Number(chosenPrice) < 1;

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();
  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";

  console.log("errors", formState.errors);

  const isDisabled = !!lessThan1 || lessThanMin;

  if (clientSecret && stripePromise) {
    return (
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret: clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    );
  }

  return (
    <FormProvider {...methods}>
      <div
        className={css`
          padding: 1.5rem 2rem 2rem;
        `}
      >
        {!!minPrice && minPrice > 0 && (
          <p>
            {t("price")}{" "}
            <Money amount={minPrice / 100} currency={trackGroup.currency} />, or
          </p>
        )}
        <form onSubmit={handleSubmit(purchaseAlbum)}>
          <FormComponent>
            <label>
              {t("nameYourPrice", {
                currency: getCurrencySymbol(trackGroup.currency, undefined),
              })}
              <InputEl
                {...register("chosenPrice")}
                type="number"
                min={minPrice ? minPrice / 100 : 0}
                step="0.01"
              />
            </label>
            {Number(chosenPrice) > (minPrice ?? 1) * 100 && (
              <Box variant="success">
                {t("thatsGenerous", {
                  chosenPrice: moneyDisplay({
                    amount: chosenPrice,
                    currency: trackGroup.currency,
                  }),
                })}
              </Box>
            )}
            {lessThanMin && (
              <small>
                {t("pleaseEnterMoreThan", { minPrice: minPrice / 100 })}
              </small>
            )}
            <PlatformPercent
              percent={trackGroup.platformPercent}
              chosenPrice={chosenPrice}
              currency={trackGroup.currency}
              artist={trackGroup.artist}
            />
          </FormComponent>

          <EmailInput required />

          <ArtistButton
            size="big"
            rounded
            type="submit"
            isLoading={stripeLoading}
            title={
              isDisabled
                ? user
                  ? (t("ensurePrice") ?? "")
                  : (t("ensurePriceAndEmail") ?? "")
                : ""
            }
            disabled={isDisabled}
          >
            {t(purchaseText)}
          </ArtistButton>

          <div
            className={css`
              margin-top: 1rem;

              small {
                display: block;
                margin-bottom: 0.5rem;
              }
            `}
          >
            <small>{t("artistCheckoutPage")}</small>

            <small>{t("downloadDisclaimer")}</small>
          </div>
        </form>
        {!isBeforeReleaseDate && (
          <>
            {!!minPrice && lessThanMin && (
              <strong>
                {t("lessThanMin", {
                  minPrice: moneyDisplay({
                    amount: minPrice / 100,
                    currency: trackGroup.currency,
                  }),
                  artistName: trackGroup.artist?.name,
                })}
              </strong>
            )}
            {!minPrice && (
              <FreeDownload trackGroup={trackGroup} chosenPrice={chosenPrice} />
            )}
          </>
        )}
      </div>
    </FormProvider>
  );
};

export default BuyTrackGroup;
