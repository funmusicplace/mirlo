import PurchaseModal from "components/common/Purchase/PurchaseModal";
import type { Checkout } from "components/common/Purchase/usePurchase";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

import { ArtistButton } from "./ArtistButtons";

const ChangePaymentMethodButton: React.FC<{
  subscriptionId: number;
  onUpdated: () => void;
  className?: string;
}> = ({ subscriptionId, onUpdated, className }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  // This flow has its own endpoint for the intent, so it doesn't go through
  // usePurchase — it only needs somewhere to hold the resulting checkout.
  const [checkout, setCheckout] = React.useState<Checkout | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);
  const reset = React.useCallback(() => setCheckout(null), []);

  const start = async () => {
    try {
      setIsStarting(true);
      const { result } = await api.put<
        undefined,
        { result: { clientSecret: string; stripeAccountId: string } }
      >(`manage/subscriptions/${subscriptionId}`, undefined);
      setCheckout({ kind: "intent", ...result });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = React.useCallback(() => {
    reset();
    snackbar(t("paymentMethodUpdated"), { type: "success" });
    onUpdated();
  }, [onUpdated, reset, snackbar, t]);

  return (
    <>
      <ArtistButton
        variant="transparent"
        color="foreground"
        size="compact"
        onClick={start}
        isLoading={isStarting}
        className={className}
      >
        {t("changePaymentMethod")}
      </ArtistButton>
      <PurchaseModal
        onClose={reset}
        checkout={checkout}
        returnUrl={window.location.href}
        onSuccess={handleComplete}
        title={t("changePaymentMethodTitle") ?? ""}
        buttonLabel={t("updatePaymentMethodButton") ?? ""}
      />
    </>
  );
};

export default ChangePaymentMethodButton;
