import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "../Modal";

import PurchaseElements from "./PurchaseElements";
import type { Checkout } from "./usePurchase";

const PurchaseModal: React.FC<{
  open: boolean;
  onClose: () => void;
  checkout: Checkout | null;
  returnUrl: string;
  onSuccess?: (buyerEmail?: string) => void;
  title: string;
  buttonLabel: string;
}> = ({
  open,
  onClose,
  checkout,
  returnUrl,
  onSuccess,
  title,
  buttonLabel,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  return (
    <Modal size="small" open={open} onClose={onClose} title={title}>
      {checkout ? (
        <PurchaseElements
          checkout={checkout}
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
