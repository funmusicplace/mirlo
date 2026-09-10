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
        clientSecret={checkout.clientSecret}
        stripeAccountId={checkout.stripeAccountId}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        buttonLabel={buttonLabel}
        requiresShipping={checkout.requiresShipping}
        allowedCountries={checkout.allowedCountries}
      />
    );
  }
  return <>{children}</>;
};

export default PurchaseStep;
