import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { buildCheckoutCompletePath } from "utils/artist";

import { usePurchase } from "./usePurchase";

/**
 * Shared by ArtistSupportBox (tier switch) and ArtistVariableSupport
 * (first-time sign-up) — both drive a subscription purchase through
 * usePurchase and, on success, need the exact same "refresh the logged-in
 * user + this artist's data, close the modal, navigate to the checkout
 * complete page" sequence. Also derives the returnUrl the PurchaseModal's
 * PaymentElement/SetupElement returns to on redirect-based payment methods.
 */
export const useSubscriptionCheckout = ({
  artist,
  refresh,
}: {
  artist?: { urlSlug?: string; id?: number } | null;
  refresh: () => void;
}) => {
  const { refreshLoggedInUser } = useAuthContext();
  const navigate = useNavigate();
  const purchase = usePurchase();
  const { reset } = purchase;

  const handlePurchaseComplete = React.useCallback(() => {
    if (!artist) return;
    refreshLoggedInUser();
    refresh();
    reset();
    navigate(
      buildCheckoutCompletePath(artist, { purchaseType: "subscription" })
    );
  }, [artist, navigate, refresh, refreshLoggedInUser, reset]);

  const returnUrl = artist
    ? `${window.location.origin}${buildCheckoutCompletePath(artist, {
        purchaseType: "subscription",
      })}`
    : window.location.origin;

  return { ...purchase, handlePurchaseComplete, returnUrl };
};
