import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import { ButtonProps } from "components/common/Button";
import Modal from "components/common/Modal";
import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { useSubscriptionCheckout } from "components/common/Purchase/useSubscriptionCheckout";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistAllTiersUrl } from "utils/artist";

import { ArtistButton, ArtistButtonLink } from "./ArtistButtons";
import ArtistVariableSupport from "./ArtistVariableSupport";
import ChangePaymentMethodButton from "./ChangePaymentMethodButton";
import SubscriptionCancelledNotice, {
  isSubscriptionCancelled,
} from "./SubscriptionCancelledNotice";

export const getUserSubscriptionToTier = (
  user: LoggedInUser | null | undefined,
  tier: ArtistSubscriptionTier
) =>
  user?.artistUserSubscriptions?.find(
    (sub) => sub.artistSubscriptionTier.id === tier.id
  );

export const isUserSubscribedToTier = (
  user: LoggedInUser | null | undefined,
  tier: ArtistSubscriptionTier
) => !!getUserSubscriptionToTier(user, tier);

const SubscriptionTierActions: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
  layout?: "page" | "card";
  supportButton?: { size?: ButtonProps["size"]; width?: string };
}> = ({ subscriptionTier, layout = "card", supportButton }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const snackbar = useSnackbar();
  const { artistId } = useParams();
  const { data: artist, refetch: refresh } = useQuery(
    queryArtist({ artistSlug: artistId })
  );
  const errorHandler = useErrorHandler();

  const {
    checkout,
    isLoading: isCheckingForSubscription,
    startPurchase,
    reset,
    handlePurchaseComplete,
    returnUrl,
  } = useSubscriptionCheckout({ artist, refresh });

  const subscribeToTier = async (tier: ArtistSubscriptionTier) => {
    const result = await startPurchase({
      artistId: tier.artistId,
      items: [{ type: "subscription", tierId: tier.id }],
    });
    refresh();
    refreshLoggedInUser();
    if (result?.success) {
      snackbar(t("subscriptionTierChanged", { tierName: tier.name }), {
        type: "success",
      });
    }
  };

  const [isConfirmingCancel, setIsConfirmingCancel] = React.useState(false);

  const cancelSubscription = async (keepFollowing: boolean) => {
    try {
      await api.delete(`artists/${subscriptionTier.artistId}/subscribe`, {
        keepFollowing,
        tierId: subscriptionTier.id,
      });
      snackbar(t("subscriptionCancelled"), { type: "success" });
      setIsConfirmingCancel(false);
      refresh();
      refreshLoggedInUser();
    } catch (e) {
      errorHandler(e);
    }
  };

  if (!artist) {
    return null;
  }

  const isSubscribedToTier = isUserSubscribedToTier(user, subscriptionTier);

  const currentSubscription = getUserSubscriptionToTier(user, subscriptionTier);

  const hasFailedPayment =
    currentSubscription?.artistUserSubscriptionCharges?.[0]?.transaction
      ?.paymentStatus === "FAILED";

  const isCancelled = isSubscriptionCancelled(currentSubscription);

  const hasOtherPaidTiers = artist.subscriptionTiers.some(
    (tier) => !tier.isDefaultTier && tier.id !== subscriptionTier.id
  );

  const isSubscribedToArtist = !!user?.artistUserSubscriptions?.find(
    (sub) =>
      sub.artistSubscriptionTier.artistId === artist.id &&
      sub.artistSubscriptionTier.id !== subscriptionTier.id &&
      !sub.artistSubscriptionTier.isDefaultTier
  );

  return (
    <>
      {((!isSubscribedToTier && !isSubscribedToArtist) || isCancelled) && (
        <ArtistVariableSupport tier={subscriptionTier} button={supportButton} />
      )}
      {(isSubscribedToTier || isSubscribedToArtist) && (
        <div
          className={
            "flex gap-3 flex-col " +
            (layout === "page" ? "items-start" : "items-center justify-center")
          }
        >
          {user && isSubscribedToArtist && !isSubscribedToTier && (
            <ArtistButton
              onClick={() => subscribeToTier(subscriptionTier)}
              isLoading={isCheckingForSubscription}
            >
              {t("chooseThisSubscription")}
            </ArtistButton>
          )}
          {user && isSubscribedToTier && !isCancelled && (
            <ArtistButton
              onClick={() => setIsConfirmingCancel(true)}
              variant="outlined"
            >
              {t(
                layout === "page" ? "manageSubscription" : "cancelSubscription"
              )}
            </ArtistButton>
          )}
          {layout === "card" &&
            user &&
            isSubscribedToTier &&
            !isCancelled &&
            currentSubscription && (
              <ChangePaymentMethodButton
                subscriptionId={currentSubscription.id}
                onUpdated={refresh}
              />
            )}
          {user && isSubscribedToTier && (
            <SubscriptionCancelledNotice
              subscription={currentSubscription}
              className={"text-sm " + (layout === "page" ? "" : "text-center")}
            />
          )}
          {hasFailedPayment && (
            <Box
              variant="warning"
              className={"text-sm " + (layout === "page" ? "" : "text-center")}
            >
              {t("subscriptionPaymentFailed")}
              <ArtistButton
                onClick={() => setIsConfirmingCancel(true)}
                variant="outlined"
              >
                {t("cancelSubscription")}
              </ArtistButton>
            </Box>
          )}
          <p>
            {isSubscribedToTier &&
              t("thankYouForSupporting", { artistName: artist.name })}
          </p>
        </div>
      )}
      <PurchaseModal
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        requiresShipping={checkout?.requiresShipping}
        allowedCountries={checkout?.allowedCountries}
        returnUrl={returnUrl}
        onSuccess={handlePurchaseComplete}
        title={t("support") ?? ""}
        buttonLabel={t("letsSupport") ?? ""}
      />
      <Modal
        open={isConfirmingCancel}
        onClose={() => setIsConfirmingCancel(false)}
        size="small"
      >
        <div className="flex flex-col gap-3">
          <p>{t("cancelSubscriptionConfirm")}</p>
          {layout === "page" && hasOtherPaidTiers && (
            <ArtistButtonLink
              variant="outlined"
              to={getArtistAllTiersUrl(artist)}
            >
              {t("changeTier")}
            </ArtistButtonLink>
          )}
          <ArtistButton
            variant="outlined"
            onClick={() => cancelSubscription(false)}
          >
            {t("unsubscribeEntirely")}
          </ArtistButton>
          <ArtistButton onClick={() => cancelSubscription(true)}>
            {t("stopPaymentsKeepFollowing")}
          </ArtistButton>
          <ArtistButton onClick={() => setIsConfirmingCancel(false)}>
            {t("nevermind")}
          </ArtistButton>
        </div>
      </Modal>
    </>
  );
};

export default SubscriptionTierActions;
