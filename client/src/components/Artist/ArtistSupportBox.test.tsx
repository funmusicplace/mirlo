import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: {
        id: 10,
        name: "Test Artist",
        userId: 10,
        user: { currency: "usd" },
      },
      refetch: vi.fn(),
    }),
  };
});

const authState: { user: any } = { user: null };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

const snackbar = vi.fn();
vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => snackbar,
}));

// The tier-switch flow (useSubscriptionCheckout) and the payment-method-update
// flow (its own direct usePurchase call) are two independent hook instances in
// the component — mocked separately here so a checkout in one flow's state
// doesn't leak into the other's <PurchaseModal>, matching how they behave in
// the real component.
const startPurchase = vi.fn();
const subscriptionCheckoutReset = vi.fn();
const subscriptionCheckoutState: {
  checkout: null | { clientSecret: string; stripeAccountId: string };
} = { checkout: null };
vi.mock("components/common/Purchase/useSubscriptionCheckout", () => ({
  useSubscriptionCheckout: () => ({
    checkout: subscriptionCheckoutState.checkout,
    isLoading: false,
    startPurchase,
    reset: subscriptionCheckoutReset,
    handlePurchaseComplete: vi.fn(),
    returnUrl: "http://localhost/return",
  }),
}));

const openPaymentMethodCheckout = vi.fn();
const paymentMethodCheckoutReset = vi.fn();
const paymentMethodCheckoutState: {
  checkout: null | { clientSecret: string; stripeAccountId: string };
} = { checkout: null };
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({
    checkout: paymentMethodCheckoutState.checkout,
    isLoading: false,
    startPurchase: vi.fn(),
    openCheckout: (next: { clientSecret: string; stripeAccountId: string }) => {
      openPaymentMethodCheckout(next);
      paymentMethodCheckoutState.checkout = next;
    },
    reset: paymentMethodCheckoutReset,
  }),
}));

vi.mock("components/common/Purchase/PurchaseModal", () => ({
  default: (props: any) =>
    props.open ? <div data-testid="purchase-modal" /> : null,
}));

const apiPut = vi.fn();
vi.mock("services/api", () => ({
  default: {
    put: (...args: any[]) => apiPut(...args),
    delete: vi.fn(),
  },
}));

import ArtistSupportBox from "./ArtistSupportBox";

const baseTier = {
  id: 1,
  artistId: 10,
  name: "Supporter",
  interval: "MONTH",
  platformPercent: 8,
  isDefaultTier: false,
  autoPurchaseAlbums: false,
  digitalDiscountPercent: null,
  merchDiscountPercent: null,
  releases: [],
} as any;

function renderComponent(subscriptionTier: any) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/test-artist"]}>
        <Routes>
          <Route
            path="/:artistId"
            element={<ArtistSupportBox subscriptionTier={subscriptionTier} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ArtistSupportBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    subscriptionCheckoutState.checkout = null;
    paymentMethodCheckoutState.checkout = null;
  });

  test("renders the variable-amount support button for a no-minimum allowVariable tier", () => {
    renderComponent({
      ...baseTier,
      minAmount: null,
      allowVariable: true,
    });

    expect(screen.getByText("support")).toBeInTheDocument();
  });

  test("renders the variable-amount support button when minAmount is exactly 0", () => {
    renderComponent({
      ...baseTier,
      minAmount: 0,
      allowVariable: true,
    });

    expect(screen.getByText("support")).toBeInTheDocument();
  });

  test("renders nothing for a tier with no minimum and no variable amount allowed", () => {
    const { container } = renderComponent({
      ...baseTier,
      minAmount: null,
      allowVariable: false,
    });

    expect(container).toBeEmptyDOMElement();
  });

  test("still renders normally for a fixed-price tier", () => {
    renderComponent({
      ...baseTier,
      minAmount: 500,
      allowVariable: false,
    });

    expect(screen.getByText("support")).toBeInTheDocument();
  });

  test("shows both the cancelled notice and a way to resubscribe for a cancelled subscription", () => {
    const tier = { ...baseTier, minAmount: 500, allowVariable: false };
    authState.user = {
      id: 20,
      artistUserSubscriptions: [
        {
          id: 99,
          artistSubscriptionTier: tier,
          deleteReason: "USER_CANCELLED",
          nextBillingDate: "2026-09-01",
        },
      ],
    };

    renderComponent(tier);

    expect(
      screen.getByText("subscriptionCancelledActiveUntil")
    ).toBeInTheDocument();
    expect(screen.getByText("support")).toBeInTheDocument();
  });

  describe("switching tiers via the unified purchase endpoint", () => {
    const otherTier = { ...baseTier, id: 2, name: "Other tier" };

    beforeEach(() => {
      authState.user = {
        id: 20,
        artistUserSubscriptions: [{ artistSubscriptionTier: otherTier }],
      };
    });

    test("shows a confirmation and opens no payment UI when the switch is applied in place", async () => {
      startPurchase.mockResolvedValue({ success: true });

      renderComponent({ ...baseTier, minAmount: 500, allowVariable: false });

      fireEvent.click(screen.getByText("chooseThisSubscription"));

      await vi.waitFor(() => expect(snackbar).toHaveBeenCalled());

      expect(startPurchase).toHaveBeenCalledWith({
        artistId: baseTier.artistId,
        items: [{ type: "subscription", tierId: baseTier.id }],
      });
      expect(snackbar).toHaveBeenCalledWith(
        "subscriptionTierChanged",
        expect.objectContaining({ type: "success" })
      );
      expect(screen.queryByTestId("purchase-modal")).not.toBeInTheDocument();
    });

    test("renders the PurchaseModal once usePurchase reports a checkout in progress", async () => {
      subscriptionCheckoutState.checkout = {
        clientSecret: "seti_secret",
        stripeAccountId: "acct_1",
      };

      renderComponent({ ...baseTier, minAmount: 500, allowVariable: false });

      expect(await screen.findByTestId("purchase-modal")).toBeInTheDocument();
    });
  });

  describe("updating the payment method via the reused usePurchase hook", () => {
    const tier = { ...baseTier, minAmount: 500, allowVariable: false };

    beforeEach(() => {
      authState.user = {
        id: 20,
        artistUserSubscriptions: [
          {
            id: 55,
            artistSubscriptionTier: tier,
          },
        ],
      };
    });

    test("PUTs to manage/subscriptions/:id and opens the shared checkout with the result", async () => {
      apiPut.mockResolvedValue({
        result: { clientSecret: "seti_pm_secret", stripeAccountId: "acct_2" },
      });

      renderComponent(tier);

      fireEvent.click(screen.getByText("changePaymentMethod"));

      await vi.waitFor(() =>
        expect(openPaymentMethodCheckout).toHaveBeenCalled()
      );

      expect(apiPut).toHaveBeenCalledWith("manage/subscriptions/55", undefined);
      expect(openPaymentMethodCheckout).toHaveBeenCalledWith({
        clientSecret: "seti_pm_secret",
        stripeAccountId: "acct_2",
      });
    });

    test("surfaces the error and never opens a checkout when the PUT fails", async () => {
      apiPut.mockRejectedValue(new Error("network error"));

      renderComponent(tier);

      fireEvent.click(screen.getByText("changePaymentMethod"));

      await vi.waitFor(() => expect(snackbar).toHaveBeenCalled());

      expect(openPaymentMethodCheckout).not.toHaveBeenCalled();
    });

    test("renders a second, independent PurchaseModal once the payment-method checkout is set", async () => {
      paymentMethodCheckoutState.checkout = {
        clientSecret: "seti_pm_secret",
        stripeAccountId: "acct_2",
      };

      renderComponent(tier);

      expect(await screen.findByTestId("purchase-modal")).toBeInTheDocument();
    });
  });
});
