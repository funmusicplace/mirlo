import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// queryUserStripeStatus is fetched via useQuery — bypass the network and
// return a connected, chargeable account for every test in this file.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { chargesEnabled: true, stripeAccountId: "acct_1" },
      isPending: false,
    }),
  };
});

const startPurchase = vi.fn().mockResolvedValue(undefined);
const purchaseState: {
  checkout: null | { clientSecret: string; stripeAccountId: string };
} = { checkout: null };
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({
    checkout: purchaseState.checkout,
    isLoading: false,
    startPurchase,
  }),
}));

vi.mock("components/common/Purchase/PurchaseElements", () => ({
  default: () => <div data-testid="purchase-elements" />,
}));

import BuyMerchItem from "./BuyMerchItem";

const baseArtist = {
  id: 10,
  name: "Test Artist",
  urlSlug: "test-artist",
  userId: 10,
  user: { currency: "usd" },
} as any;

const baseMerch = {
  id: "merch-1",
  artistId: 10,
  artist: baseArtist,
  title: "Test Shirt",
  description: "A shirt",
  minPrice: 1000,
  currency: "usd",
  urlSlug: "test-shirt",
  quantityRemaining: 5,
  isPublic: true,
  images: [],
  shippingDestinations: [],
  optionTypes: [],
} as any;

function renderComponent(merch: any) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BuyMerchItem merch={merch} artist={baseArtist} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function submitForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("form not found");
  fireEvent.submit(form);
  await waitFor(() => expect(startPurchase).toHaveBeenCalled());
}

describe("BuyMerchItem", () => {
  beforeEach(() => {
    startPurchase.mockClear();
    purchaseState.checkout = null;
  });

  test("submitting purchases the merch item via the unified endpoint", async () => {
    const { container } = renderComponent(baseMerch);
    await submitForm(container);

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: 10,
        items: [
          expect.objectContaining({
            type: "merch",
            id: "merch-1",
            quantity: 1,
          }),
        ],
      })
    );
  });

  test("does not request shipping/address collection for a digital-only item (no destinations)", async () => {
    const { container } = renderComponent(baseMerch);
    await submitForm(container);

    // No shipping destination was ever offered for this digital-only item.
    const call = startPurchase.mock.calls[0][0];
    expect(call.items[0].shippingDestinationId).toBeFalsy();
  });

  test("renders the Payment Element once usePurchase reports a checkout in progress", async () => {
    purchaseState.checkout = {
      clientSecret: "secret_1",
      stripeAccountId: "acct_1",
    };
    renderComponent(baseMerch);

    expect(await screen.findByTestId("purchase-elements")).toBeInTheDocument();
  });

  test("renders nothing when the artist isn't charge-enabled or the item is sold out", () => {
    const { container } = renderComponent({
      ...baseMerch,
      quantityRemaining: 0,
    });

    expect(container).toBeEmptyDOMElement();
  });
});
