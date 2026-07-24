import React from "react";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

/** A single item in a purchase cart. Mirrors `POST /v1/purchase`'s `items`. */
export type PurchaseItem =
  | { type: "trackGroup"; id: number; price?: string; message?: string }
  | { type: "track"; id: number; price?: string; message?: string }
  | {
      type: "merch";
      id: string;
      quantity?: number;
      price?: string;
      merchOptionIds?: string[];
      shippingDestinationId?: string;
      message?: string;
    }
  | { type: "tip"; amount: number; message?: string }
  | {
      type: "subscription";
      tierId: number;
      amount?: number;
      /** Self-chosen display name, captured when the buyer has no account name yet. */
      userName?: string;
    };

type PurchaseResponse = {
  clientSecret?: string;
  stripeAccountId?: string;
  redirectUrl?: string;
  /**
   * Set when the cart contains a physical item. `allowedCountries` is the
   * server-resolved set of countries this item can ship to, accounting for
   * EU/Schengen grouping and banned countries.
   */
  requiresShipping?: boolean;
  allowedCountries?: string[];
  /**
   * A subscription tier switch that was applied to the existing Stripe
   * subscription in place — no clientSecret, no further payment step.
   */
  success?: boolean;
};

export type Checkout = {
  clientSecret: string;
  stripeAccountId: string;
  requiresShipping?: boolean;
  allowedCountries?: string[];
};

/**
 * Drives the unified purchase flow. `startPurchase` POSTs to `/v1/purchase` and
 * either navigates (free trackGroup redirect) or exposes a `checkout` that a
 * `<PurchaseModal>` renders the Stripe Payment Element for. The POST runs on a
 * user action (not a mount effect), so there's no StrictMode/double-fire dance.
 */
export const usePurchase = () => {
  const errorHandler = useErrorHandler();
  const navigate = useNavigate();
  const [checkout, setCheckout] = React.useState<Checkout | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const startPurchase = React.useCallback(
    async (args: {
      artistId: number;
      items: PurchaseItem[];
      email?: string;
    }): Promise<{ success: true } | undefined> => {
      try {
        setIsLoading(true);
        const response = await api.post<typeof args, PurchaseResponse>(
          "purchase",
          args
        );

        if (response.redirectUrl) {
          navigate(response.redirectUrl);
          return;
        }
        if (response.success) {
          return { success: true };
        }
        if (response.clientSecret && response.stripeAccountId) {
          setCheckout({
            clientSecret: response.clientSecret,
            stripeAccountId: response.stripeAccountId,
            requiresShipping: response.requiresShipping,
            allowedCountries: response.allowedCountries,
          });
          return;
        }
        throw new Error(
          "Payment could not be started (missing client secret or account)."
        );
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsLoading(false);
      }
    },
    [errorHandler, navigate]
  );

  const reset = React.useCallback(() => setCheckout(null), []);

  return { checkout, isLoading, startPurchase, reset };
};
