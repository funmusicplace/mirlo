import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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

// Stripe.js is irrelevant to the branching we're testing — stub it out.
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("components/common/Purchase/PurchasePaymentForm", () => ({
  default: ({ returnUrl }: { returnUrl: string }) => (
    <div data-testid="payment-form" data-return-url={returnUrl} />
  ),
}));

import Checkout from "./Index";

type IntentResult = {
  id: string;
  status: string;
  clientSecret: string | null;
  successUrl: string | null;
  amount: number | null;
  currency: string | null;
  artistName: string | null;
};

function mockIntentFetch(intent: IntentResult) {
  vi.mocked(fetch).mockImplementation(async () => {
    return new Response(JSON.stringify({ result: intent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Checkout />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const PATH = "/checkout?paymentIntentId=pi_1&stripeAccountId=acct_1";

describe("Checkout", () => {
  beforeEach(() => {
    mockIntentFetch({
      id: "pi_1",
      status: "requires_payment_method",
      clientSecret: "pi_1_secret_abc",
      successUrl: "https://wp-site.com/thanks",
      amount: 1000,
      currency: "usd",
      artistName: "Test Artist",
    });
  });

  test("shows an error when required query params are missing", async () => {
    renderAt("/checkout");
    await waitFor(() => {
      expect(screen.getByText("missingParameters")).toBeInTheDocument();
    });
  });

  test("renders the payment form with the server-supplied successUrl as return", async () => {
    renderAt(PATH);
    await waitFor(() => {
      expect(screen.getByTestId("payment-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("payment-form")).toHaveAttribute(
      "data-return-url",
      "https://wp-site.com/thanks"
    );
    // Buyer sees who they're paying and how much (the t() mock returns the key).
    expect(screen.getByText("payingArtistAmount")).toBeInTheDocument();
  });

  test("bounces to successUrl when the intent already succeeded", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: "https://mirlo.space", assign },
      writable: true,
    });
    mockIntentFetch({
      id: "pi_1",
      status: "succeeded",
      clientSecret: "pi_1_secret_abc",
      successUrl: "https://wp-site.com/thanks",
      amount: 1000,
      currency: "usd",
      artistName: "Test Artist",
    });

    renderAt(PATH);

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://wp-site.com/thanks");
    });
    expect(screen.queryByTestId("payment-form")).not.toBeInTheDocument();
  });

  test("shows a load error when no clientSecret comes back", async () => {
    mockIntentFetch({
      id: "pi_1",
      status: "requires_payment_method",
      clientSecret: null,
      successUrl: null,
      amount: 1000,
      currency: "usd",
      artistName: "Test Artist",
    });
    renderAt(PATH);
    await waitFor(() => {
      expect(screen.getByText("couldNotLoad")).toBeInTheDocument();
    });
  });
});
