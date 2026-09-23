import { Button } from "components/common/Button";
import { Sale } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEnvelope } from "react-icons/fa";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";

/**
 * Sends the buyer their receipt again, for when the original never arrived
 * (#2286). The artist doesn't get a second sale notification.
 */
const ResendReceiptButton: React.FC<{ sale: Sale; className?: string }> = ({
  sale,
  className,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "sales" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSending, setIsSending] = React.useState(false);
  const [hasSent, setHasSent] = React.useState(false);

  const resend = React.useCallback(async () => {
    setIsSending(true);
    try {
      const response = await api.post<unknown, { result: { sentTo: string } }>(
        `manage/sales/${sale.id}/resendReceipt`,
        {}
      );
      setHasSent(true);
      snackbar(t("receiptResent", { email: response.result.sentTo }), {
        type: "success",
      });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsSending(false);
    }
  }, [errorHandler, sale.id, snackbar, t]);

  if (!sale.id) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outlined"
      size="compact"
      className={className}
      startIcon={<FaEnvelope />}
      isLoading={isSending}
      disabled={hasSent}
      onClick={resend}
    >
      {t(hasSent ? "receiptSent" : "resendReceipt")}
    </Button>
  );
};

export default ResendReceiptButton;
