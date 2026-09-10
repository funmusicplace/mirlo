import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import EmailVerification from "components/common/EmailVerification";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Money, { moneyDisplay } from "components/common/Money";
import PurchaseStep from "components/common/Purchase/PurchaseStep";
import { usePurchase } from "components/common/Purchase/usePurchase";
import TextArea from "components/common/TextArea";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { buildCheckoutCompletePath } from "utils/artist";

import AddToCollection from "./AddToCollection";
import PaymentInputElement from "./PaymentInputElement";
import { testOwnership } from "./utils";

interface FormData {
  chosenPrice: string;
  message?: string;
  consentToStoreData: boolean;
}

const BuyTrackGroup: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  noPadding?: boolean;
  onPurchaseComplete?: () => void;
}> = ({ trackGroup, track, noPadding, onPurchaseComplete }) => {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [stripeLoading, setStripeLoading] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();

  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const currency = trackGroup.currency ?? "usd";
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
    trackGroup.paymentToUserId ??
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
  const { checkout, startPurchase } = usePurchase();

  const isPledgeMode =
    !!trackGroup.fundraiser?.isAllOrNothing &&
    (trackGroup.fundraiser?.status ?? "ACTIVE") === "ACTIVE";

  const checkoutCompletePath = (buyerEmail?: string) =>
    buildCheckoutCompletePath(trackGroup.artist, {
      purchaseType: track ? "track" : "trackGroup",
      trackGroupId: trackGroup.id.toString(),
      ...(track && { trackId: track.id.toString() }),
      ...(buyerEmail && { email: buyerEmail }),
    });

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        setStripeLoading(true);
        if (user || verifiedEmail) {
          const alreadyOwns = await testOwnership(
            trackGroup.id,
            verifiedEmail ?? ""
          );
          if (alreadyOwns && !window.confirm(t("albumExists") ?? "")) {
            return;
          }
        }

        if (isPledgeMode && trackGroup.fundraiserId) {
          await startPurchase({
            artistId: trackGroup.artistId ?? trackGroup.artist.id,
            items: [
              {
                type: "fundraiserPledge",
                fundraiserId: trackGroup.fundraiserId,
                trackGroupId: trackGroup.id,
                price: data.chosenPrice
                  ? String(Number(data.chosenPrice) * 100)
                  : undefined,
                message: data.message,
              },
            ],
            email: verifiedEmail ?? undefined,
          });
          return;
        }

        await startPurchase({
          artistId: trackGroup.artistId ?? trackGroup.artist.id,
          items: [
            {
              type: track ? "track" : "trackGroup",
              id: track ? track.id : trackGroup.id,
              price: data.chosenPrice
                ? String(Number(data.chosenPrice) * 100)
                : undefined,
              message: data.message,
            },
          ],
        });
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
      } finally {
        setStripeLoading(false);
      }
    },
    [
      snackbar,
      t,
      trackGroup,
      track,
      user,
      verifiedEmail,
      isPledgeMode,
      startPurchase,
    ]
  );

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }
  const isNegativePrice = isFinite(+chosenPrice) && Number(chosenPrice) < 0;

  const purchaseText = isPledgeMode
    ? "addPaymentInformation"
    : trackGroup.isPreorder
      ? "preOrder"
      : "buy";

  const isDisabled =
    lessThanMin ||
    isNegativePrice ||
    !isValid ||
    (isPledgeMode && !consentToStoreData);

  if (isPending) {
    return (
      <div className="p-4">
        <LoadingBlocks height="3rem" margin="1rem" />
      </div>
    );
  }

  if (!stripeAccountStatus?.chargesEnabled) {
    if (minPrice === 0 || minPrice === null) {
      return (
        <div className="m-4">
          {user && (
            <p className="mb-2">
              {t("addAlbumToCollection", { title: trackGroup.title }) ?? ""}
            </p>
          )}
          <AddToCollection trackGroup={trackGroup} track={track} />{" "}
          {user && <p className="mt-2">{t("addToCollectionDescription")}</p>}
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

  return (
    <div className={noPadding ? "" : "p-4"}>
      <PurchaseStep
        checkout={checkout}
        returnUrl={`${window.location.origin}${checkoutCompletePath()}`}
        onSuccess={(buyerEmail) => {
          onPurchaseComplete?.();
          navigate(checkoutCompletePath(buyerEmail));
        }}
        buttonLabel={t("completePayment")}
      >
        <FormProvider {...methods}>
          {isPledgeMode && (
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
              {t("price")} <Money amount={minPrice / 100} currency={currency} />
              , or
            </p>
          )}
          <form
            className="flex flex-col"
            onSubmit={handleSubmit(purchaseAlbum)}
          >
            <FormComponent>
              <PaymentInputElement
                currency={currency}
                platformPercent={trackGroup.platformPercent}
                minPrice={minPrice}
                basePrice={initialChosenPriceCents}
                artistName={trackGroup.artist?.name}
                artistId={trackGroup.artistId}
                isDigital
              />
            </FormComponent>

            <FormComponent>
              <label htmlFor="message">{t("leaveAComment")}</label>
              <TextArea
                id="message"
                {...methods.register("message")}
                rows={2}
              />
            </FormComponent>

            {isPledgeMode && !user && (
              <EmailVerification
                setVerifiedEmail={setVerifiedEmail}
                contextSubject={`${trackGroup.title}: ${trackGroup.artist?.name}`}
              />
            )}

            {(!isPledgeMode || user || verifiedEmail) && (
              <>
                {isPledgeMode && (
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
                  title={isDisabled ? t("ensurePrice") : ""}
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
                      currency: trackGroup.artist?.user?.currency ?? "usd",
                    }),
                    artistName: trackGroup.artist?.name,
                  })}
                </strong>
              )}
            </>
          )}
          <hr />
          {(minPrice === 0 || minPrice === null) && (
            <div className="mt-4">
              {user && (
                <p className="mb-2">
                  {t("addAlbumToCollection", { title: trackGroup.title }) ?? ""}
                </p>
              )}
              <AddToCollection trackGroup={trackGroup} track={track} />{" "}
              {user && (
                <p className="mt-2">{t("addToCollectionDescription")}</p>
              )}
            </div>
          )}
        </FormProvider>
      </PurchaseStep>
    </div>
  );
};

export default BuyTrackGroup;
