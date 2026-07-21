import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({
    user: null,
    refreshLoggedInUser: vi.fn(),
  }),
}));

vi.mock("components/common/stripe/EmbeddedStripe", () => ({
  default: () => <div data-testid="embedded-stripe" />,
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
});
