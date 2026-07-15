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

// The Stripe account status is fetched via useQuery — bypass the network and
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

vi.mock("./utils", () => ({
  testOwnership: vi.fn().mockResolvedValue(false),
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: { id: 1, email: "buyer@test.com", artistUserSubscriptions: [] },
  }),
}));

const startPurchase = vi.fn().mockResolvedValue(undefined);
const purchaseState: {
  checkout: null | { clientSecret: string; stripeAccountId: string };
} = { checkout: null };
vi.mock("components/common/Purchase/usePurchase", () => ({
  usePurchase: () => ({
    checkout: purchaseState.checkout,
    startPurchase,
  }),
}));

vi.mock("components/common/Purchase/PurchaseElements", () => ({
  default: () => <div data-testid="purchase-elements" />,
}));

vi.mock("components/common/stripe/EmbeddedStripe", () => ({
  default: () => <div data-testid="embedded-stripe" />,
}));

import BuyTrackGroup from "./BuyTrackGroup";

const baseArtist = {
  id: 10,
  name: "Test Artist",
  urlSlug: "test-artist",
  userId: 10,
  user: { currency: "usd" },
};

const baseTrackGroup = {
  id: 100,
  title: "Test Album",
  urlSlug: "test-album",
  artistId: 10,
  artist: baseArtist,
  minPrice: 500,
  suggestedPrice: 500,
  currency: "usd",
  platformPercent: 8,
  isPreorder: false,
} as any;

function renderComponent(
  props: Partial<React.ComponentProps<typeof BuyTrackGroup>>
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BuyTrackGroup trackGroup={baseTrackGroup} {...props} />
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

describe("BuyTrackGroup", () => {
  beforeEach(() => {
    startPurchase.mockClear();
    purchaseState.checkout = null;
  });

  test("submitting without a track purchases the trackGroup via the unified endpoint", async () => {
    const { container } = renderComponent({});
    await submitForm(container);

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: 10,
        items: [expect.objectContaining({ type: "trackGroup", id: 100 })],
      })
    );
  });

  test("submitting with a track purchases the track (not the trackGroup) via the unified endpoint", async () => {
    const track = { id: 200, minPrice: 300 } as any;
    const { container } = renderComponent({ track });
    await submitForm(container);

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: 10,
        items: [expect.objectContaining({ type: "track", id: 200 })],
      })
    );
  });

  test("renders the Payment Element once usePurchase reports a checkout in progress", async () => {
    purchaseState.checkout = {
      clientSecret: "secret_1",
      stripeAccountId: "acct_1",
    };
    renderComponent({});

    expect(await screen.findByTestId("purchase-elements")).toBeInTheDocument();
  });
});
