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
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

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

const authState = vi.hoisted(() => ({
  user: { id: 1, email: "buyer@test.com", artistUserSubscriptions: [] } as {
    id: number;
    email: string;
    artistUserSubscriptions: unknown[];
  } | null,
  refreshLoggedInUser: vi.fn(),
}));
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: authState.user,
    refreshLoggedInUser: authState.refreshLoggedInUser,
  }),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

const snackbar = vi.hoisted(() => vi.fn());
vi.mock("state/SnackbarContext", () => ({
  useSnackbar: () => snackbar,
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
    startPurchase.mockResolvedValue(undefined);
    navigate.mockClear();
    snackbar.mockClear();
    authState.refreshLoggedInUser.mockClear();
    authState.user = {
      id: 1,
      email: "buyer@test.com",
      artistUserSubscriptions: [],
    };
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

  test("submitting an active all-or-nothing fundraiser's trackGroup pledges via the unified endpoint", async () => {
    const pledgeTrackGroup = {
      ...baseTrackGroup,
      fundraiserId: 55,
      fundraiser: { id: 55, isAllOrNothing: true, status: "ACTIVE" },
    };
    const { container } = renderComponent({ trackGroup: pledgeTrackGroup });

    const consent = container.querySelector(
      "#consentToStoreData"
    ) as HTMLElement;
    fireEvent.click(consent);
    await submitForm(container);

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: 10,
        items: [
          expect.objectContaining({
            type: "fundraiserPledge",
            fundraiserId: 55,
            trackGroupId: 100,
          }),
        ],
      })
    );
  });

  describe("naming a price of zero on a free release", () => {
    const freeTrackGroup = {
      ...baseTrackGroup,
      minPrice: 0,
      suggestedPrice: 0,
    };

    test("acquires it for free rather than opening a Stripe checkout", async () => {
      startPurchase.mockResolvedValue({ redirectUrl: "/somewhere/download" });
      const { container } = renderComponent({ trackGroup: freeTrackGroup });
      await submitForm(container);

      expect(startPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 10,
          items: [
            expect.objectContaining({
              type: "trackGroup",
              id: 100,
              price: "0",
            }),
          ],
        }),
        { skipRedirect: true }
      );
    });

    test("refreshes the logged in user so the release stops looking unowned", async () => {
      startPurchase.mockResolvedValue({ redirectUrl: "/somewhere/download" });
      const { container } = renderComponent({ trackGroup: freeTrackGroup });
      await submitForm(container);

      await waitFor(() =>
        expect(authState.refreshLoggedInUser).toHaveBeenCalled()
      );
    });

    test("sends the buyer to the checkout complete page", async () => {
      startPurchase.mockResolvedValue({ redirectUrl: "/somewhere/download" });
      const { container } = renderComponent({ trackGroup: freeTrackGroup });
      await submitForm(container);

      await waitFor(() => expect(navigate).toHaveBeenCalled());
      const [target] = navigate.mock.calls[0];
      expect(target).toContain("checkout-complete");
      expect(target).toContain("purchaseType=trackGroup");
      expect(target).toContain("trackGroupId=100");
    });

    test("asks a logged out visitor to sign up instead of charging them", async () => {
      authState.user = null;
      const { container } = renderComponent({ trackGroup: freeTrackGroup });

      const form = container.querySelector("form");
      if (!form) throw new Error("form not found");
      fireEvent.submit(form);

      await waitFor(() =>
        expect(snackbar).toHaveBeenCalledWith("signUpToGetFreeRelease", {
          type: "warning",
        })
      );
      expect(startPurchase).not.toHaveBeenCalled();
    });

    test("still charges normally when a price above zero is named", async () => {
      const { container } = renderComponent({ trackGroup: freeTrackGroup });

      const priceInput = container.querySelector(
        "input[name='chosenPrice']"
      ) as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: "5" } });

      await submitForm(container);

      expect(startPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ price: "500" })],
        })
      );
    });
  });

  test("a fundraiser that is no longer ACTIVE purchases the trackGroup normally, not as a pledge", async () => {
    const successfulFundraiserTrackGroup = {
      ...baseTrackGroup,
      fundraiserId: 55,
      fundraiser: { id: 55, isAllOrNothing: true, status: "SUCCESSFUL" },
    };
    const { container } = renderComponent({
      trackGroup: successfulFundraiserTrackGroup,
    });
    await submitForm(container);

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: 10,
        items: [expect.objectContaining({ type: "trackGroup", id: 100 })],
      })
    );
  });
});
