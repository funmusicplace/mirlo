import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import api from "services/api";
import { mockJsonFetch } from "test-utils/mockFetch";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key}:${opts.amount}` : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("services/api", () => ({
  default: { post: vi.fn() },
}));

const originalLocation = window.location;

import PurchaseCatalogueButton from "./PurchaseCatalogueButton";

function makeArtist(overrides: Partial<{ user: { currency?: string } }> = {}) {
  return {
    id: 1,
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderButton(artist = makeArtist()) {
  return render(<PurchaseCatalogueButton artist={artist} />, {
    wrapper: createWrapper(),
  });
}

describe("PurchaseCatalogueButton", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({
      redirectUrl: "https://checkout.example.com",
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    });
  });

  test("renders nothing when there is no floor price", async () => {
    mockCataloguePriceFetch(null);
    const { container } = renderButton();
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  test("purchases at the floor price by default", async () => {
    mockCataloguePriceFetch(1500);
    renderButton();

    await userEvent.click(
      await screen.findByRole("button", {
        name: /purchaseEntireCatalogueAtLeast/,
      })
    );

    expect(api.post).toHaveBeenCalledWith("artists/1/purchaseCatalogue", {
      price: 1500,
    });
  });

  test("lets a buyer pay more than the floor", async () => {
    mockCataloguePriceFetch(1500);
    renderButton();

    await userEvent.click(
      await screen.findByRole("button", { name: "payMore" })
    );
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "25");

    await userEvent.click(
      screen.getByRole("button", { name: /purchaseEntireCatalogue:/ })
    );

    expect(api.post).toHaveBeenCalledWith("artists/1/purchaseCatalogue", {
      price: 2500,
    });
  });

  test("never submits less than the floor even if the input is edited below it", async () => {
    mockCataloguePriceFetch(1500);
    renderButton();

    await userEvent.click(
      await screen.findByRole("button", { name: "payMore" })
    );
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "1");

    await userEvent.click(
      screen.getByRole("button", { name: /purchaseEntireCatalogue:/ })
    );

    expect(api.post).toHaveBeenCalledWith("artists/1/purchaseCatalogue", {
      price: 1500,
    });
  });
});
