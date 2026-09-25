import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import "i18n";

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

import TopAccountsTables from "./TopAccountsTables";

const renderTables = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <TopAccountsTables />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("TopAccountsTables", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({
      result: {
        period: "month",
        sellers: [
          {
            id: 3,
            name: "Big Seller",
            urlSlug: "big-seller",
            usdCents: 5000,
            transactionCount: 2,
          },
        ],
        purchasers: [
          {
            id: 7,
            name: null,
            email: "big@buyer.com",
            usdCents: 1250,
            transactionCount: 1,
          },
        ],
      },
    } as any);
  });

  test("links each seller and purchaser to their admin page", async () => {
    renderTables();

    await waitFor(() => screen.getByText("Big Seller"));

    expect(screen.getByText("Big Seller").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/artists/3"
    );
    // Falls back to the email when the user has no name.
    expect(screen.getByText("big@buyer.com").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/users/7"
    );
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  test("refetches for the past year when the period is switched", async () => {
    renderTables();

    expect(api.get).toHaveBeenCalledWith("admin/topAccounts?period=month");

    await userEvent.selectOptions(screen.getByRole("combobox"), "year");

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("admin/topAccounts?period=year")
    );
  });
});
