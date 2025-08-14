import Money, {
  getCurrencySymbol,
  moneyDisplay,
} from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { FormProvider, useForm } from "react-hook-form";
import EmailInput from "./EmailInput";
import PlatformPercent from "components/common/PlatformPercent";
import { css } from "@emotion/css";
import { testOwnership } from "./utils";
import Box from "components/common/Box";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { useAuthContext } from "state/AuthContext";
import TextArea from "components/common/TextArea";
import EmbeddedStripeForm from "components/common/EmbeddedStripe";
import EmailVerification from "components/common/EmailVerification";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
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
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null);
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${minPrice ? minPrice / 100 : ""}`,
    },
    reValidateMode: "onChange",
  });
  const { register, watch, handleSubmit, formState } = methods;
  const { isValid } = formState;
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
            message: data.message,
          });

          if (response.clientSecret) {
            setClientSecret(response.clientSecret);
          } else {
            window.location.assign(response.redirectUrl);
          }
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
        setStripeLoading(false);
      }
    },
    [snackbar, t, trackGroup.id, track]
  );

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();
  const purchaseText = isBeforeReleaseDate ? "preOrder" : "buy";

  const isDisabled = lessThanMin || !isValid;

  if (clientSecret) {
    return <EmbeddedStripeForm clientSecret={clientSecret} />;
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
            <label htmlFor="priceInput">
              {t("nameYourPrice", {
                currency: getCurrencySymbol(trackGroup.currency, undefined),
              })}{" "}
            </label>

            <InputEl
              {...register("chosenPrice")}
              type="number"
              min={minPrice ? minPrice / 100 : 0}
              step="0.01"
              id="priceInput"
            />
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
                {t("pleaseEnterMoreThan", {
                  minPrice: (minPrice ?? 100) / 100,
                })}
              </small>
            )}
            <PlatformPercent
              percent={trackGroup.platformPercent}
              chosenPrice={chosenPrice}
              currency={trackGroup.currency}
              artist={trackGroup.artist}
            />
          </FormComponent>

          <FormComponent>
            <label htmlFor="message">{t("leaveAComment")}</label>
            <TextArea id="message" {...methods.register("message")} rows={2} />
            <small>{t("messageToArtist")}</small>
          </FormComponent>

          {!user && <EmailVerification setVerifiedEmail={setVerifiedEmail} />}

          {(user || verifiedEmail) && (
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
          )}

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
          </>
        )}
      </div>
    </FormProvider>
  );
};

export default BuyTrackGroup;
