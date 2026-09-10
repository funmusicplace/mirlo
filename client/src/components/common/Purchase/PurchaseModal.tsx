import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "../Modal";

import PurchaseElements from "./PurchaseElements";

const PurchaseModal: React.FC<{
  open: boolean;
  onClose: () => void;
  clientSecret?: string;
  stripeAccountId?: string;
  returnUrl: string;
  onSuccess?: (buyerEmail?: string) => void;
  title: string;
  buttonLabel: string;
  requiresShipping?: boolean;
  allowedCountries?: string[];
}> = ({
  open,
  onClose,
  clientSecret,
  stripeAccountId,
  returnUrl,
  onSuccess,
  title,
  buttonLabel,
  requiresShipping,
  allowedCountries,
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
          requiresShipping={requiresShipping}
          allowedCountries={allowedCountries}
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
