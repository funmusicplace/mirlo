import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import Modal from "components/common/Modal";
import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { usePurchase } from "components/common/Purchase/usePurchase";
import { useSubscriptionCheckout } from "components/common/Purchase/useSubscriptionCheckout";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import { ArtistButton } from "./ArtistButtons";
import ArtistVariableSupport from "./ArtistVariableSupport";
import SubscriptionCancelledNotice, {
  isSubscriptionCancelled,
} from "./SubscriptionCancelledNotice";

export const isUserSubscribedToTier = (
  user: LoggedInUser | null | undefined,
  tier: ArtistSubscriptionTier
) =>
  !!user?.artistUserSubscriptions?.find(
    (sub) => sub.artistSubscriptionTier.id === tier.id
  );

const SubscriptionTierActions: React.FC<{
  subscriptionTier: ArtistSubscriptionTier;
}> = ({ subscriptionTier }) => {
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

  // A separate usePurchase instance for the payment-method-update flow: same
  // checkout/<PurchaseModal> machinery as the tier-switch flow above, but its
  // clientSecret comes from PUT manage/subscriptions/:id (not POST
  // /v1/purchase), so it drives its own openCheckout call instead of
  // startPurchase: hence its own loading flag around that fetch, rather than
  // usePurchase's own isLoading (which only tracks startPurchase).
  const {
    checkout: paymentMethodCheckout,
    openCheckout: openPaymentMethodCheckout,
    reset: resetPaymentMethodCheckout,
  } = usePurchase();
  const [isStartingPaymentMethodUpdate, setIsStartingPaymentMethodUpdate] =
    React.useState(false);

  const startPaymentMethodUpdate = async (subscriptionId: number) => {
    try {
      setIsStartingPaymentMethodUpdate(true);
      const { result } = await api.put<
        undefined,
        { result: { clientSecret: string; stripeAccountId: string } }
      >(`manage/subscriptions/${subscriptionId}`, undefined);
      openPaymentMethodCheckout(result);
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsStartingPaymentMethodUpdate(false);
    }
  };

  const handlePaymentMethodUpdateComplete = React.useCallback(() => {
    resetPaymentMethodCheckout();
    snackbar(t("paymentMethodUpdated"), { type: "success" });
    refresh();
  }, [refresh, resetPaymentMethodCheckout, snackbar, t]);

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

  const currentSubscription = user?.artistUserSubscriptions?.find(
    (sub) => sub.artistSubscriptionTier.id === subscriptionTier.id
  );

  const hasFailedPayment =
    currentSubscription?.artistUserSubscriptionCharges?.[0]?.transaction
      ?.paymentStatus === "FAILED";

  const isCancelled = isSubscriptionCancelled(currentSubscription);

  const isSubscribedToArtist = !!user?.artistUserSubscriptions?.find(
    (sub) =>
      sub.artistSubscriptionTier.artistId === artist.id &&
      sub.artistSubscriptionTier.id !== subscriptionTier.id &&
      !sub.artistSubscriptionTier.isDefaultTier
  );

  return (
    <>
      {((!isSubscribedToTier && !isSubscribedToArtist) || isCancelled) && (
        <ArtistVariableSupport tier={subscriptionTier} />
      )}
      {(isSubscribedToTier || isSubscribedToArtist) && (
        <div className="flex items-center justify-center gap-3 flex-col">
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
              onClick={() =>
                currentSubscription &&
                startPaymentMethodUpdate(currentSubscription.id)
              }
              variant="outlined"
              isLoading={isStartingPaymentMethodUpdate}
            >
              {t("changePaymentMethod")}
            </ArtistButton>
          )}
          {user && isSubscribedToTier && !isCancelled && (
            <ArtistButton
              onClick={() => setIsConfirmingCancel(true)}
              variant="outlined"
            >
              {t("cancelSubscription")}
            </ArtistButton>
          )}
          {user && isSubscribedToTier && (
            <SubscriptionCancelledNotice
              subscription={currentSubscription}
              className="text-sm text-center"
            />
          )}
          {hasFailedPayment && (
            <Box variant="warning" className="text-sm text-center">
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
      <PurchaseModal
        open={!!paymentMethodCheckout}
        onClose={resetPaymentMethodCheckout}
        clientSecret={paymentMethodCheckout?.clientSecret}
        stripeAccountId={paymentMethodCheckout?.stripeAccountId}
        returnUrl={window.location.href}
        onSuccess={handlePaymentMethodUpdateComplete}
        title={t("changePaymentMethodTitle") ?? ""}
        buttonLabel={t("updatePaymentMethodButton") ?? ""}
      />
      <Modal
        open={isConfirmingCancel}
        onClose={() => setIsConfirmingCancel(false)}
        size="small"
      >
        <div className="flex flex-col gap-3">
          <p>{t("cancelSubscriptionConfirm")}</p>
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
