import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { Checkout as PurchaseCheckout } from "components/common/Purchase/usePurchase";
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

vi.mock("components/common/Purchase/PurchaseElements", () => ({
  default: ({
    checkout,
    returnUrl,
  }: {
    checkout: PurchaseCheckout;
    returnUrl: string;
  }) => (
    <div
      data-testid="payment-form"
      data-return-url={returnUrl}
      data-mode={checkout.kind === "deferred" ? checkout.quote.mode : ""}
      data-checkout-id={
        checkout.kind === "deferred" ? checkout.quote.checkoutId : ""
      }
    />
  ),
}));

import Checkout from "./Index";

const quote = {
  checkoutId: "txn_abc",
  mode: "payment",
  amount: 1000,
  currency: "usd",
  stripeAccountId: "acct_1",
  requiresShipping: false,
  buyerEmailKnown: false,
  artistName: "Test Artist",
  successUrl: "https://wp-site.com/thanks",
};

function mockOpen(body: unknown, status = 200) {
  vi.mocked(fetch).mockImplementation(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Checkout />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const PATH = "/checkout?checkoutId=txn_abc";

describe("Checkout", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    mockOpen({ deferred: quote });
  });

  test("shows an error when the checkout id is missing", async () => {
    renderAt("/checkout");
    await waitFor(() => {
      expect(screen.getByText("missingParameters")).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("quotes the checkout once and renders the payment form from it", async () => {
    renderAt(PATH);
    await waitFor(() => {
      expect(screen.getByTestId("payment-form")).toBeInTheDocument();
    });
    const form = screen.getByTestId("payment-form");
    expect(form).toHaveAttribute(
      "data-return-url",
      "https://wp-site.com/thanks"
    );
    expect(form).toHaveAttribute("data-mode", "payment");
    expect(form).toHaveAttribute("data-checkout-id", "txn_abc");
    // Buyer sees who they're paying and how much (the t() mock returns the key).
    expect(screen.getByText("payingArtistAmount")).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      checkoutId: "txn_abc",
      deferred: true,
    });
  });

  test("renders a subscription's setup-mode quote", async () => {
    mockOpen({ deferred: { ...quote, mode: "setup", amount: undefined } });

    renderAt(PATH);

    await waitFor(() => {
      expect(screen.getByTestId("payment-form")).toHaveAttribute(
        "data-mode",
        "setup"
      );
    });
    expect(screen.getByText("payingArtist")).toBeInTheDocument();
  });

  test("says so when the checkout has already been paid", async () => {
    mockOpen({ success: true });

    renderAt(PATH);

    await waitFor(() => {
      expect(screen.getByText("alreadyComplete")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("payment-form")).not.toBeInTheDocument();
  });

  test("shows a load error for an unknown or completed checkout", async () => {
    mockOpen(
      { error: "This checkout doesn't exist or has already been completed" },
      404
    );
    renderAt(PATH);
    await waitFor(() => {
      expect(screen.getByText("couldNotLoad")).toBeInTheDocument();
    });
  });
});
