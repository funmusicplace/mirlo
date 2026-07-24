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

const startPurchase = vi.fn();
const purchaseState: {
  checkout: null | { clientSecret: string; stripeAccountId: string };
} = { checkout: null };
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({
    checkout: purchaseState.checkout,
    isLoading: false,
    startPurchase,
    reset: vi.fn(),
  }),
}));

vi.mock("components/common/Purchase/PurchaseModal", () => ({
  default: (props: any) =>
    props.open ? <div data-testid="purchase-modal" /> : null,
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
    purchaseState.checkout = null;
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
      purchaseState.checkout = {
        clientSecret: "seti_secret",
        stripeAccountId: "acct_1",
      };

      renderComponent({ ...baseTier, minAmount: 500, allowVariable: false });

      expect(await screen.findByTestId("purchase-modal")).toBeInTheDocument();
    });
  });
});
