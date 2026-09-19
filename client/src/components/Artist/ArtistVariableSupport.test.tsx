import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        properties: {},
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

vi.mock("components/common/Purchase/PurchaseStep", () => ({
  default: (props: any) =>
    props.checkout ? (
      <div data-testid="purchase-step-payment" />
    ) : (
      props.children
    ),
}));

import ArtistVariableSupport from "./ArtistVariableSupport";

const baseTier = {
  id: 1,
  artistId: 10,
  name: "Supporter",
  interval: "MONTH",
  minAmount: 500,
  allowVariable: false,
  description: "",
} as any;

function renderComponent(tier: any) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/test-artist"]}>
        <Routes>
          <Route
            path="/:artistId"
            element={<ArtistVariableSupport tier={tier} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ArtistVariableSupport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    purchaseState.checkout = null;
  });

  test("a logged-in user with a name subscribes to a fixed-price tier without opening a modal", async () => {
    authState.user = { id: 5, name: "Buyer", email: "buyer@example.com" };
    renderComponent(baseTier);

    fireEvent.click(screen.getByText("support"));

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());

    expect(startPurchase).toHaveBeenCalledWith({
      artistId: baseTier.artistId,
      items: [{ type: "subscription", tierId: baseTier.id, amount: 500 }],
    });
    expect(
      screen.queryByTestId("purchase-step-payment")
    ).not.toBeInTheDocument();
  });

  test("opens the amount modal for an allowVariable tier", () => {
    authState.user = { id: 5, name: "Buyer", email: "buyer@example.com" };
    renderComponent({ ...baseTier, allowVariable: true, minAmount: null });

    fireEvent.click(screen.getByText("support"));

    expect(screen.getByText("chooseAnAmount")).toBeInTheDocument();
    expect(startPurchase).not.toHaveBeenCalled();
  });

  test("submits a whole-number amount (in cents) for an allowVariable tier", async () => {
    authState.user = { id: 5, name: "Buyer", email: "buyer@example.com" };
    const tier = { ...baseTier, allowVariable: true, minAmount: null };
    renderComponent(tier);

    fireEvent.click(screen.getByText("support"));

    const amountInput = screen.getByRole("spinbutton");
    fireEvent.change(amountInput, { target: { value: "12.5" } });

    const form = amountInput.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ type: "subscription", tierId: tier.id, amount: 1250 }],
      })
    );
  });

  test("blocks submission and never calls startPurchase when the amount is cleared", async () => {
    authState.user = { id: 5, name: "Buyer", email: "buyer@example.com" };
    const tier = { ...baseTier, allowVariable: true, minAmount: 500 };
    renderComponent(tier);

    fireEvent.click(screen.getByText("support"));

    const amountInput = screen.getByRole("spinbutton");
    fireEvent.change(amountInput, { target: { value: "" } });

    const form = amountInput.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() =>
      expect(screen.getByText("mustBeAtLeast")).toBeInTheDocument()
    );
    expect(startPurchase).not.toHaveBeenCalled();
  });

  test("a logged-out buyer subscribes without being asked for an email here", async () => {
    renderComponent(baseTier);

    fireEvent.click(screen.getByText("support"));

    expect(screen.queryByLabelText("yourEmailLabel")).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText(/yourNameLabel/);
    const form = nameInput.closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ artistId: baseTier.artistId })
    );
    expect(startPurchase.mock.calls[0][0]).not.toHaveProperty("email");
  });

  test("shows the payment step for a fixed-price tier that skipped the modal", async () => {
    authState.user = { id: 5, name: "Buyer", email: "buyer@example.com" };
    purchaseState.checkout = {
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
    };

    renderComponent(baseTier);

    expect(
      await screen.findByTestId("purchase-step-payment")
    ).toBeInTheDocument();
  });

  test("swaps to the payment step in the same modal once checkout is in progress", async () => {
    purchaseState.checkout = {
      clientSecret: "seti_secret",
      stripeAccountId: "acct_1",
    };

    renderComponent(baseTier);
    fireEvent.click(screen.getByRole("button", { name: "support" }));

    expect(
      await screen.findByTestId("purchase-step-payment")
    ).toBeInTheDocument();
  });
});
