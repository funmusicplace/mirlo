import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "../Modal";

import PurchaseElements from "./PurchaseElements";

/**
 * Standalone purchase modal: opens its own `<Modal>` around the shared
 * `PurchaseElements`. Use this for a buy button that isn't already inside a
 * dialog. Flows whose trigger is itself a modal (album, tip) should render
 * `PurchaseElements` inline instead, to avoid stacking dialogs.
 */
const PurchaseModal: React.FC<{
  open: boolean;
  onClose: () => void;
  clientSecret?: string;
  stripeAccountId?: string;
  /**
   * Absolute URL Stripe redirects to after a successful payment. Used as the
   * fallback for redirect-required methods (3DS); for the common case the modal
   * completes in-page via `onSuccess`.
   */
  returnUrl: string;
  /**
   * Called when payment completes without a redirect. Provide it to keep the
   * flow on-page (no reload — the audio player keeps playing) and navigate
   * within the SPA yourself. Omit to fall back to a full redirect to `returnUrl`.
   */
  onSuccess?: () => void;
  title: string;
  buttonLabel: string;
}> = ({
  open,
  onClose,
  clientSecret,
  stripeAccountId,
  returnUrl,
  onSuccess,
  title,
  buttonLabel,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  return (
    <Modal size="small" open={open} onClose={onClose} title={title}>
      {clientSecret && stripeAccountId ? (
        <PurchaseElements
          clientSecret={clientSecret}
          stripeAccountId={stripeAccountId}
          returnUrl={returnUrl}
          onSuccess={onSuccess}
          buttonLabel={buttonLabel}
        />
      ) : (
        <div className="p-4">
          <p className="mb-2">{t("preparingPayment")}</p>
          <LoadingBlocks rows={1} />
        </div>
      )}
    </Modal>
  );
};

export default PurchaseModal;
