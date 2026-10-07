import React from "react";

import PurchaseElements from "./PurchaseElements";
import type { Checkout } from "./usePurchase";

const PurchaseStep: React.FC<{
  checkout: Checkout | null;
  returnUrl: string;
  onSuccess?: (buyerEmail?: string) => void;
  buttonLabel: string;
  children: React.ReactNode;
}> = ({ checkout, returnUrl, onSuccess, buttonLabel, children }) => {
  if (checkout) {
    return (
      <PurchaseElements
        checkout={checkout}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
      />
    );
  }
  return <>{children}</>;
};

export default PurchaseStep;
