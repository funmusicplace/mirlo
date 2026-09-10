import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { mockJsonFetch } from "test-utils/mockFetch";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key}:${opts.amount}` : key,
    i18n: { language: "en" },
  }),
}));

const authState: { user: any } = { user: null };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: authState.user }),
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

import PurchaseCatalogueButton from "./PurchaseCatalogueButton";

function makeArtist(overrides: Partial<{ user: { currency?: string } }> = {}) {
  return {
    id: 1,
    urlSlug: "test-artist",
    user: { currency: "usd" },
    ...overrides,
  } as Artist;
}

function mockCataloguePriceFetch(price: number | null) {
  mockJsonFetch([
    { matcher: "/purchaseCatalogue", body: { result: { price } } },
  ]);
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderButton(artist = makeArtist()) {
  return render(<PurchaseCatalogueButton artist={artist} />, {
    wrapper: createWrapper(),
  });
}

describe("PurchaseCatalogueButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    purchaseState.checkout = null;
  });

  test("renders nothing when there is no floor price", async () => {
    mockCataloguePriceFetch(null);
    const { container } = renderButton();
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  test("purchases at the floor price for a logged-in buyer", async () => {
    authState.user = { id: 5, email: "buyer@example.com" };
    mockCataloguePriceFetch(1500);
    renderButton();

    await userEvent.click(
      await screen.findByRole("button", { name: /purchaseEntireCatalogue:/ })
    );

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());
    expect(startPurchase).toHaveBeenCalledWith({
      artistId: 1,
      items: [{ type: "catalogue", price: "1500" }],
      email: undefined,
    });
  });

  test("a logged-out buyer takes the same one-click path, with no email asked for here", async () => {
    mockCataloguePriceFetch(1500);
    renderButton();

    await userEvent.click(
      await screen.findByRole("button", { name: /purchaseEntireCatalogue:/ })
    );

    await waitFor(() => expect(startPurchase).toHaveBeenCalled());
    expect(startPurchase).toHaveBeenCalledWith({
      artistId: 1,
      items: [{ type: "catalogue", price: "1500" }],
    });
    expect(screen.queryByLabelText("email")).not.toBeInTheDocument();
  });

  test("renders the PurchaseModal once usePurchase reports a checkout in progress", async () => {
    mockCataloguePriceFetch(1500);
    purchaseState.checkout = {
      clientSecret: "pi_secret",
      stripeAccountId: "acct_1",
    };
    renderButton();

    expect(await screen.findByTestId("purchase-modal")).toBeInTheDocument();
  });
});
