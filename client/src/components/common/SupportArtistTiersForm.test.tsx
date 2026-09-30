import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@marsidev/react-turnstile", () => ({ Turnstile: () => null }));

const PAID_TIER = {
  id: 3,
  artistId: 10,
  name: "Supporter",
  description: "",
  isDefaultTier: false,
  minAmount: 500,
  interval: "MONTH",
};

vi.mock("utils/useGetArtistSubscriptionTiers", () => ({
  default: () => ({
    data: { id: 10, user: { currency: "usd" } },
    tiers: [PAID_TIER],
    currentTier: undefined,
    refetch: vi.fn(),
  }),
}));

const authState: { user: any } = { user: null };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: vi.fn(),
  }),
}));

const snackbar = vi.fn();
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => snackbar }));

const apiPost = vi.fn();
vi.mock("services/api", () => ({
  default: { post: (...args: unknown[]) => apiPost(...args) },
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

vi.mock("components/common/Purchase/PurchaseElements", () => ({
  default: () => <div data-testid="purchase-elements" />,
}));

import SupportArtistTiersForm from "./SupportArtistTiersForm";

const ARTIST = { id: 10, name: "Test Artist", userId: 1, urlSlug: "test" };

const renderForm = () =>
  render(
    <MemoryRouter>
      <SupportArtistTiersForm artist={ARTIST} />
    </MemoryRouter>
  );

describe("SupportArtistTiersForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    purchaseState.checkout = null;
  });

  test("subscribes a logged-out fan through the purchase flow, not the legacy subscribe endpoint", async () => {
    renderForm();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByText("continueWithPriceMonthly"));

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());
    expect(startPurchase).toHaveBeenCalledWith({
      artistId: ARTIST.id,
      items: [{ type: "subscription", tierId: PAID_TIER.id }],
      email: "fan@example.com",
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  test("uses the logged-in account rather than sending an email", async () => {
    authState.user = { id: 5, email: "buyer@example.com" };
    renderForm();

    fireEvent.click(screen.getByText("continueWithPriceMonthly"));

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());
    expect(startPurchase.mock.calls[0][0].email).toBeUndefined();
  });

  test("confirms an in-place tier switch", async () => {
    authState.user = { id: 5, email: "buyer@example.com" };
    startPurchase.mockResolvedValue({ success: true });
    renderForm();

    fireEvent.click(screen.getByText("continueWithPriceMonthly"));

    await waitFor(() =>
      expect(snackbar).toHaveBeenCalledWith("subscriptionTierChanged", {
        type: "success",
      })
    );
  });

  test("shows the payment form once checkout has started", () => {
    purchaseState.checkout = {
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
    };
    renderForm();

    expect(screen.getByTestId("purchase-elements")).toBeInTheDocument();
  });
});
