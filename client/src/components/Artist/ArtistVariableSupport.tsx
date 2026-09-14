import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { InputEl } from "components/common/Input";
import MarkdownContent from "components/common/MarkdownContent";
import Modal from "components/common/Modal";
import { getCurrencySymbol } from "components/common/Money";
import PurchaseStep from "components/common/Purchase/PurchaseStep";
import { useSubscriptionCheckout } from "components/common/Purchase/useSubscriptionCheckout";
import { isEmpty } from "lodash";
import { queryArtist } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

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
    },
  });
  const { user, refreshLoggedInUser } = useAuthContext();
  const needsName = !user?.name;
  const needsModal = tier.allowVariable || needsName;
  const [open, setOpen] = React.useState(false);
  const { artistId } = useParams();
  const { data: artist, refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistId })
  );
  const supportButtonText =
    artist?.properties?.titles?.supportButton?.trim() || t("support");

  const {
    checkout,
    isLoading: isCheckingForSubscription,
    startPurchase,
    reset,
    handlePurchaseComplete,
    returnUrl,
  } = useSubscriptionCheckout({ artist, refresh });

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    await startPurchase({
      artistId: tier.artistId,
      items: [
        {
          type: "subscription",
          tierId: tier.id,
          amount: tier.allowVariable
            ? Math.round((getValues("amount") || 0) * 100)
            : (tier.minAmount ?? undefined),
          ...(needsName && { userName: getValues("name") }),
        },
      ],
    });
    refresh();
    refreshLoggedInUser();
  };

  const closeModal = () => {
    setOpen(false);
    reset();
  };

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
        open={open || !!checkout}
        onClose={closeModal}
        title={
          (checkout
            ? t("support")
            : tier.allowVariable
              ? t("howMuch")
              : t("letsSupport")) ?? ""
        }
      >
        <PurchaseStep
          checkout={checkout}
          returnUrl={returnUrl}
          onSuccess={handlePurchaseComplete}
          buttonLabel={t("letsSupport") ?? ""}
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
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...register("amount", {
                      min: tier.minAmount ? tier.minAmount / 100 : undefined,
                      required: true,
                      valueAsNumber: true,
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
        </PurchaseStep>
      </Modal>
    </>
  );
};

export default ArtistVariableSupport;
