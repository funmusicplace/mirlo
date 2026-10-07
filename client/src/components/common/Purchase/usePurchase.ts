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
  | { type: "catalogue"; price?: string; message?: string }
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

export type DeferredQuote = {
  checkoutId: string;
  mode: "payment" | "setup";
  amount?: number;
  currency: string;
  stripeAccountId: string;
  requiresShipping: boolean;
  allowedCountries?: string[];
  buyerEmailKnown: boolean;
  artistName: string | null;
  successUrl: string | null;
};

type PurchaseResponse = {
  deferred?: DeferredQuote;
  redirectUrl?: string;
  success?: boolean;
};

export type Checkout =
  | { kind: "deferred"; quote: DeferredQuote }
  | { kind: "intent"; clientSecret: string; stripeAccountId: string };

export const usePurchase = () => {
  const errorHandler = useErrorHandler();
  const navigate = useNavigate();
  const [checkout, setCheckout] = React.useState<Checkout | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const startPurchase = React.useCallback(
    async (
      args: {
        artistId: number;
        items: PurchaseItem[];
        email?: string;
      },
      // Free acquisitions come back as a redirect to the download page. Callers
      // that want to land somewhere else (e.g. the checkout complete page) opt
      // out of the automatic navigation and route the user themselves.
      options?: { skipRedirect?: boolean }
    ): Promise<{ success?: true; redirectUrl?: string } | undefined> => {
      try {
        setIsLoading(true);
        const response = await api.post<
          typeof args & { deferred: true },
          PurchaseResponse
        >("purchase", { ...args, deferred: true });

        if (response.redirectUrl) {
          if (options?.skipRedirect) {
            return { redirectUrl: response.redirectUrl };
          }
          navigate(response.redirectUrl);
          return;
        }
        if (response.success) {
          return { success: true };
        }
        if (response.deferred) {
          setCheckout({ kind: "deferred", quote: response.deferred });
          return;
        }
        throw new Error("Payment could not be started.");
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
