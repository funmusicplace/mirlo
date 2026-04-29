import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import EmailVerification from "components/common/EmailVerification";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Money, { moneyDisplay } from "components/common/Money";
import EmbeddedStripeForm from "components/common/stripe/EmbeddedStripe";
import TextArea from "components/common/TextArea";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import AddToCollection from "./AddToCollection";
import PaymentInputElement from "./PaymentInputElement";
import { testOwnership } from "./utils";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
  consentToStoreData: boolean;
}

const BuyTrackGroup: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  noPadding?: boolean;
}> = ({ trackGroup, track, noPadding }) => {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [stripeLoading, setStripeLoading] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();

  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const initialChosenPriceCents = track
    ? (minPrice ?? 0)
    : Math.max(trackGroup.suggestedPrice ?? 0, minPrice ?? 0);
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null);
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${initialChosenPriceCents ? initialChosenPriceCents / 100 : ""}`,
    },
    reValidateMode: "onChange",
  });
  const paymentUserId =
    trackGroup.paymentToUser?.id ??
    trackGroup.artist?.paymentToUserId ??
    trackGroup.artist?.userId ??
    0;
  const { data: stripeAccountStatus, isPending } = useQuery(
    queryUserStripeStatus(paymentUserId)
  );

  const { watch, handleSubmit, formState } = methods;
  const { isValid } = formState;
  const chosenPrice = watch("chosenPrice");
  const consentToStoreData = watch("consentToStoreData");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [onComplete, setOnComplete] = React.useState<(() => void) | undefined>(
    undefined
  );

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
            email: data.userEmail ?? verifiedEmail,
            message: data.message,
          });

          if (response.clientSecret) {
            const artistSlug =
              trackGroup.artist?.urlSlug ?? trackGroup.artist?.id;
            const params = new URLSearchParams();
            params.set("purchaseType", track ? "track" : "trackGroup");
            params.set("trackGroupId", trackGroup.id.toString());
            if (track) params.set("trackId", track.id.toString());
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
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
        setStripeLoading(false);
      }
    },
    [snackbar, t, trackGroup, track, verifiedEmail, navigate]
  );

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const purchaseText = trackGroup.fundraiser?.isAllOrNothing
    ? "addPaymentInformation"
    : trackGroup.isPreorder
      ? "preOrder"
      : "buy";

  const isDisabled =
    lessThanMin ||
    !isValid ||
    (trackGroup.fundraiser?.isAllOrNothing && !consentToStoreData);

  if (isPending) {
    return (
      <div className="p-4">
        <LoadingBlocks height="3rem" margin="1rem" />
      </div>
    );
  }

  if (!stripeAccountStatus?.chargesEnabled) {
    if (minPrice === 0) {
      return (
        <div className="m-4">
          <p className="mb-2">
            {t("addAlbumToCollection", { title: trackGroup.title }) ?? ""}
          </p>
          <AddToCollection trackGroup={trackGroup} />{" "}
          <p className="mt-2">{t("addToCollectionDescription")}</p>
        </div>
      );
    }
    return (
      <div className="p-4">
        {t("artistNotSetUp", {
          artistName: trackGroup.artist?.name,
        })}
      </div>
    );
  }

  if (clientSecret && stripeAccountStatus?.stripeAccountId) {
    return (
      <EmbeddedStripeForm
        clientSecret={clientSecret}
        isSetupIntent={trackGroup.fundraiser?.isAllOrNothing}
        stripeAccountId={stripeAccountStatus?.stripeAccountId}
        onComplete={onComplete}
      />
    );
  }

  return (
    <FormProvider {...methods}>
      <div className={noPadding ? "" : "p-4"}>
        {trackGroup.fundraiser?.isAllOrNothing && (
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t("backThisProjectDescription")}
          </p>
        )}
        {!!minPrice && minPrice > 0 && (
          <p>
            {t("price")}{" "}
            <Money amount={minPrice / 100} currency={trackGroup.currency} />, or
          </p>
        )}
        <form className="flex flex-col" onSubmit={handleSubmit(purchaseAlbum)}>
          <FormComponent>
            <PaymentInputElement
              currency={trackGroup.currency}
              platformPercent={trackGroup.platformPercent}
              minPrice={minPrice}
              artistName={trackGroup.artist?.name}
              artistId={trackGroup.artistId}
              isDigital
            />
          </FormComponent>

          <FormComponent>
            <label htmlFor="message">{t("leaveAComment")}</label>
            <TextArea id="message" {...methods.register("message")} rows={2} />
            <small>{t("messageToArtist")}</small>
          </FormComponent>

          {!user && (
            <EmailVerification
              setVerifiedEmail={setVerifiedEmail}
              contextSubject={`${trackGroup.title}: ${trackGroup.artist?.name}`}
            />
          )}

          {(user || verifiedEmail) && (
            <>
              {trackGroup.fundraiser?.isAllOrNothing && (
                <FormComponent direction="row">
                  <InputEl
                    type="checkbox"
                    id="consentToStoreData"
                    {...methods.register("consentToStoreData")}
                  />
                  <label htmlFor="consentToStoreData">
                    {t("consentToStoreData")}
                  </label>
                </FormComponent>
              )}
              <Button
                size="big"
                rounded
                type="submit"
                endIcon={<FaArrowRight />}
                className="self-end"
                isLoading={stripeLoading}
                title={
                  isDisabled
                    ? user
                      ? t("ensurePrice")
                      : t("ensurePriceAndEmail")
                    : ""
                }
                disabled={isDisabled}
              >
                {t(purchaseText)}
              </Button>
            </>
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
        {!trackGroup.isPreorder && (
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
        <hr />
        {minPrice === 0 ||
          (minPrice === null && (
            <div className="mt-4">
              <p className="mb-2">
                {t("addAlbumToCollection", { title: trackGroup.title }) ?? ""}
              </p>
              <AddToCollection trackGroup={trackGroup} />{" "}
              <p className="mt-2">{t("addToCollectionDescription")}</p>
            </div>
          ))}
      </div>
    </FormProvider>
  );
};

export default BuyTrackGroup;
