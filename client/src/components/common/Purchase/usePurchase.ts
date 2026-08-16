import React from "react";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

/** A single item in a purchase cart */
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
      userName?: string;
    }
  | {
      type: "fundraiserPledge";
      fundraiserId: number;
      trackGroupId: number;
      price?: string;
      message?: string;
    };

type PurchaseResponse = {
  clientSecret?: string;
  stripeAccountId?: string;
  redirectUrl?: string;
  requiresShipping?: boolean;
  allowedCountries?: string[];
  success?: boolean;
};

export type Checkout = {
  clientSecret: string;
  stripeAccountId: string;
  requiresShipping?: boolean;
  allowedCountries?: string[];
};

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

  const openCheckout = React.useCallback(
    (next: Checkout) => setCheckout(next),
    []
  );

  return { checkout, isLoading, startPurchase, openCheckout, reset };
};
