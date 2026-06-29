import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import EmailVerification from "components/common/EmailVerification";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Money, { moneyDisplay } from "components/common/Money";
import PurchaseElements from "components/common/Purchase/PurchaseElements";
import { usePurchase } from "components/common/Purchase/usePurchase";
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
import { getArtistUrl } from "utils/artist";

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
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [onComplete, setOnComplete] = React.useState<(() => void) | undefined>(
    undefined
  );
  const { checkout, startPurchase } = usePurchase();

  const isPledgeMode =
    !!trackGroup.fundraiser?.isAllOrNothing &&
    (trackGroup.fundraiser?.status ?? "ACTIVE") === "ACTIVE";
  // DEPRECATED — Flow A (per-resource Checkout Session + EmbeddedStripeForm).
  // Track purchases (plan Phase 4) and fundraiser pledges (Phase 5) are not yet
  // resolved by `POST /v1/purchase`, so they stay on the deprecated
  // `tracks/:id/purchase` / `trackGroups/:id/purchase` endpoints. Remove this
  // branch once both are migrated onto usePurchase/PurchaseModal — album
  // (trackGroup) purchases already are.
  const usesLegacyFlow = !!track || isPledgeMode;

  const checkoutCompletePath = `${getArtistUrl(
    trackGroup.artist
  )}/checkout-complete?purchaseType=trackGroup&trackGroupId=${trackGroup.id}`;

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        setStripeLoading(true);
        const email = data.userEmail ?? verifiedEmail ?? "";
        const alreadyOwns = await testOwnership(trackGroup.id, email);
        const confirmed = alreadyOwns
          ? window.confirm(t("albumExists") ?? "")
          : true;

        if (!confirmed) {
          return;
        }

        if (usesLegacyFlow) {
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
            email,
            message: data.message,
          });

          if (response.clientSecret) {
            const artistSlug =
              trackGroup.artist?.urlSlug ?? trackGroup.artist?.id;
            const params = new URLSearchParams();
            params.set("purchaseType", track ? "track" : "trackGroup");
            params.set("trackGroupId", trackGroup.id.toString());
            if (track) params.set("trackId", track.id.toString());
            setOnComplete(() => () => {
              // Let callers (e.g. the in-player buy modal) clear any
              // play-limit / overplayed state that's keeping the player
              // blocked before we navigate away (#1630).
              onPurchaseComplete?.();
              navigate(`/${artistSlug}/checkout-complete?${params.toString()}`);
            });
            setClientSecret(response.clientSecret);
          } else {
            window.location.assign(response.redirectUrl);
          }
          return;
        }

        // Album (trackGroup) → unified POST /v1/purchase. The modal/return-url
        // handles completion; the post-payment full-page redirect resets the
        // player, covering what onPurchaseComplete did inline (#1630).
        await startPurchase({
          artistId: trackGroup.artistId ?? trackGroup.artist.id,
          items: [
            {
              type: "trackGroup",
              id: trackGroup.id,
              // determinePrice expects the chosen price in cents.
              price: data.chosenPrice
                ? String(Number(data.chosenPrice) * 100)
                : undefined,
              message: data.message,
            },
          ],
          email: email || undefined,
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
      verifiedEmail,
      navigate,
      onPurchaseComplete,
      usesLegacyFlow,
      startPurchase,
    ]
  );

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }
  const isNegativePrice = isFinite(+chosenPrice) && Number(chosenPrice) < 0;

  // The pledge flow only applies while the fundraiser is still ACTIVE (see
  // #1681); `isPledgeMode` is computed up top alongside the legacy-flow check.

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
          <AddToCollection trackGroup={trackGroup} />{" "}
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

  if (clientSecret && stripeAccountStatus?.stripeAccountId) {
    return (
      <EmbeddedStripeForm
        clientSecret={clientSecret}
        isSetupIntent={isPledgeMode}
        stripeAccountId={stripeAccountStatus?.stripeAccountId}
        onComplete={onComplete}
      />
    );
  }

  // Unified album purchase: swap the buy form for the Payment Element in place,
  // within the same modal the trigger already opened — no second dialog.
  if (checkout) {
    return (
      <div className={noPadding ? "" : "p-4"}>
        <PurchaseElements
          clientSecret={checkout.clientSecret}
          stripeAccountId={checkout.stripeAccountId}
          returnUrl={`${window.location.origin}${checkoutCompletePath}`}
          onSuccess={() => {
            // Clear any play-limit / overplayed state keeping the player
            // blocked (#1630), then navigate within the SPA — no reload, so
            // playback during the purchase continues.
            onPurchaseComplete?.();
            navigate(checkoutCompletePath);
          }}
          buttonLabel={t("completePayment")}
        />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className={noPadding ? "" : "p-4"}>
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
            {t("price")} <Money amount={minPrice / 100} currency={currency} />,
            or
          </p>
        )}
        <form className="flex flex-col" onSubmit={handleSubmit(purchaseAlbum)}>
          <FormComponent>
            <PaymentInputElement
              currency={currency}
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
          </FormComponent>

          {!user && (
            <EmailVerification
              setVerifiedEmail={setVerifiedEmail}
              contextSubject={`${trackGroup.title}: ${trackGroup.artist?.name}`}
            />
          )}

          {(user || verifiedEmail) && (
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
            <AddToCollection trackGroup={trackGroup} />{" "}
            {user && <p className="mt-2">{t("addToCollectionDescription")}</p>}
          </div>
        )}
      </div>
    </FormProvider>
  );
};

export default BuyTrackGroup;
