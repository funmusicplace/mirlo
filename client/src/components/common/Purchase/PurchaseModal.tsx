import React from "react";

import Modal from "../Modal";

import PurchaseElements from "./PurchaseElements";
import type { Checkout } from "./usePurchase";

/** Opens once there's a checkout to pay for. */
const PurchaseModal: React.FC<{
  onClose: () => void;
  checkout: Checkout | null;
  returnUrl: string;
  onSuccess?: (buyerEmail?: string) => void;
  title: string;
  buttonLabel: string;
}> = ({ onClose, checkout, returnUrl, onSuccess, title, buttonLabel }) => (
  <Modal size="small" open={!!checkout} onClose={onClose} title={title}>
    {checkout && (
      <PurchaseElements
        checkout={checkout}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
      />
    )}
  </Modal>
);

export default PurchaseModal;
