import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { usePurchase } from "components/common/Purchase/usePurchase";
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
  const { checkout, openCheckout, reset } = usePurchase();
  const [isStarting, setIsStarting] = React.useState(false);

  const start = async () => {
    try {
      setIsStarting(true);
      const { result } = await api.put<
        undefined,
        { result: { clientSecret: string; stripeAccountId: string } }
      >(`manage/subscriptions/${subscriptionId}`, undefined);
      openCheckout(result);
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
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        returnUrl={window.location.href}
        onSuccess={handleComplete}
        title={t("changePaymentMethodTitle") ?? ""}
        buttonLabel={t("updatePaymentMethodButton") ?? ""}
      />
    </>
  );
};

export default ChangePaymentMethodButton;
