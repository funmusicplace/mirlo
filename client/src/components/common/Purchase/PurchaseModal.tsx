import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import React from "react";
import { useTranslation } from "react-i18next";

import Modal from "../Modal";

import PurchasePaymentForm from "./PurchasePaymentForm";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

/**
 * The shared purchase modal. Given a `checkout` (clientSecret + connected
 * account) produced by `usePurchase`, it renders Stripe's Payment Element.
 * Loading the account's Stripe.js and POSTing the cart live elsewhere — this
 * component is pure presentation.
 */
const PurchaseModal: React.FC<{
  open: boolean;
  onClose: () => void;
  clientSecret?: string;
  stripeAccountId?: string;
  /** Absolute URL Stripe redirects to after a successful payment. */
  returnUrl: string;
  title: string;
  buttonLabel: string;
}> = ({
  open,
  onClose,
  clientSecret,
  stripeAccountId,
  returnUrl,
  title,
  buttonLabel,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  // Load Stripe.js once per connected account. Passing the promise straight to
  // <Elements> means the instance is created once, not re-created each render.
  const stripePromise = React.useMemo(
    () =>
      stripeAccountId && stripeKey
        ? loadStripe(stripeKey, { stripeAccount: stripeAccountId })
        : null,
    [stripeAccountId]
  );

  return (
    <Modal size="small" open={open} onClose={onClose} title={title}>
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PurchasePaymentForm
            returnUrl={returnUrl}
            buttonLabel={buttonLabel}
          />
        </Elements>
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
