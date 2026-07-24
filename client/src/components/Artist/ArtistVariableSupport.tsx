import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { InputEl } from "components/common/Input";
import MarkdownContent from "components/common/MarkdownContent";
import Modal from "components/common/Modal";
import { getCurrencySymbol } from "components/common/Money";
import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { usePurchase } from "components/common/Purchase/usePurchase";
import { isEmpty } from "lodash";
import { queryArtist } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { buildCheckoutCompletePath } from "utils/artist";

import { ArtistButton } from "./ArtistButtons";
import IncludedReleases from "./IncludedReleases";

const ArtistVariableSupport: React.FC<{
  tier: ArtistSubscriptionTier;
}> = ({ tier }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { handleSubmit, register, formState, getValues } = useForm({
    defaultValues: {
      amount: tier.minAmount ? tier.minAmount / 100 : 0,
      name: "",
      email: "",
    },
  });
  const { user, refreshLoggedInUser } = useAuthContext();
  // Offer logged-out buyers (and accounts without a name) an optional display
  // name so the artist sees who's supporting them — shown explicitly rather
  // than scraped from Stripe's billing details.
  const needsName = !user?.name;
  // The Payment/Setup Element (unlike Stripe's old hosted Checkout) doesn't
  // collect an email itself, so a logged-out buyer needs their own field.
  const needsEmail = !user;
  // Open the pre-checkout modal whenever there's something to collect (a
  // variable amount, name, and/or email); otherwise subscribe straight through.
  const needsModal = tier.allowVariable || needsName || needsEmail;
  const [open, setOpen] = React.useState(false);
  const { artistId } = useParams();
  const { data: artist, refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistId })
  );
  const supportButtonText =
    artist?.properties?.titles?.supportButton?.trim() || t("support");

  const navigate = useNavigate();
  const {
    checkout,
    isLoading: isCheckingForSubscription,
    startPurchase,
    reset,
  } = usePurchase();

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    await startPurchase({
      artistId: tier.artistId,
      items: [
        {
          type: "subscription",
          tierId: tier.id,
          amount: tier.allowVariable
            ? getValues("amount") * 100
            : (tier.minAmount ?? undefined),
          ...(needsName && { userName: getValues("name") }),
        },
      ],
      ...(needsEmail && { email: getValues("email") }),
    });
    setOpen(false);
    refresh();
    refreshLoggedInUser();
  };

  const handlePurchaseComplete = React.useCallback(() => {
    if (!artist) return;
    refreshLoggedInUser();
    refresh();
    reset();
    navigate(
      buildCheckoutCompletePath(artist, { purchaseType: "subscription" })
    );
  }, [artist, navigate, refresh, refreshLoggedInUser, reset]);

  return (
    <>
      <ArtistButton
        size="big"
        rounded
        uppercase
        onClick={() => (needsModal ? setOpen(true) : subscribeToTier(tier))}
        isLoading={isCheckingForSubscription}
        disabled={isCheckingForSubscription}
        className={css`
          width: 100%;
        `}
      >
        {supportButtonText}
      </ArtistButton>
      <Modal
        size="small"
        open={open}
        onClose={() => setOpen(false)}
        title={(tier.allowVariable ? t("howMuch") : t("letsSupport")) ?? ""}
      >
        <form
          onSubmit={handleSubmit(() => subscribeToTier(tier))}
          className="flex flex-col gap-3"
        >
          {tier.allowVariable && (
            <>
              <strong>{t("chooseAnAmount")}</strong>
              <div className="flex items-center gap-2 ">
                <span className="whitespace-nowrap">
                  {getCurrencySymbol(artist?.user?.currency ?? "usd")}
                </span>
                <InputEl
                  {...register("amount", {
                    min: tier.minAmount ? tier.minAmount / 100 : undefined,
                    required: true,
                  })}
                />
                <span className="whitespace-nowrap">
                  {t(tier.interval === "MONTH" ? "monthly" : "yearly")}
                </span>
                {!!tier.minAmount && formState.errors?.amount && (
                  <small>
                    {t("mustBeAtLeast", { minAmount: tier.minAmount / 100 })}
                  </small>
                )}
              </div>
            </>
          )}
          {needsEmail && (
            <label className="flex flex-col gap-1">
              <span>{t("yourEmailLabel")}</span>
              <InputEl
                type="email"
                {...register("email", { required: true })}
              />
            </label>
          )}
          {needsName && (
            <label className="flex flex-col gap-1">
              <span>{t("yourNameLabel", { artistName: artist?.name })}</span>
              <InputEl {...register("name")} />
              <small>{t("yourNameHint")}</small>
            </label>
          )}
          <ArtistButton
            isLoading={isCheckingForSubscription}
            disabled={isCheckingForSubscription || !isEmpty(formState.errors)}
            size="big"
            uppercase
            rounded
            type="submit"
            className="w-full mt-2"
          >
            {t("letsSupport")}
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
          </div>
          <hr className="border-(--mi-darken-x-background-color)" />
          <MarkdownContent content={tier.description ?? ""} />
          <div className="w-full">{t("includesNewReleasesLong")}</div>
          <IncludedReleases tier={tier} />
        </form>
      </Modal>
      <PurchaseModal
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        returnUrl={
          artist
            ? `${window.location.origin}${buildCheckoutCompletePath(artist, {
                purchaseType: "subscription",
              })}`
            : window.location.origin
        }
        onSuccess={handlePurchaseComplete}
        title={t("support") ?? ""}
        buttonLabel={t("letsSupport") ?? ""}
      />
    </>
  );
};

export default ArtistVariableSupport;
