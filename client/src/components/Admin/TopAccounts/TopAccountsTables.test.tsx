import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeTopRankings } from "../../../../test/mocks";

vi.mock("services/api", () => ({
  default: { get: vi.fn(), getFile: vi.fn() },
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

const rankings = makeTopRankings("month", 1);
rankings.topSellers.rows[0] = {
  ...rankings.topSellers.rows[0],
  id: 3,
  name: "Big Seller",
  revenueCents: 5000,
};
rankings.topPurchasers.rows[0] = {
  ...rankings.topPurchasers.rows[0],
  id: 7,
  name: null,
  email: "big@buyer.com",
  cents: 1250,
};
rankings.topListeners.rows[0] = {
  ...rankings.topListeners.rows[0],
  id: 8,
  name: "Keen Fan",
  playCount: 321,
};
rankings.topFreeDownloads.rows[0] = {
  ...rankings.topFreeDownloads.rows[0],
  id: 4,
  name: "Free Artist",
  freeDownloads: 42,
};
rankings.topUploaders = makeTopRankings("month", 20).topUploaders;
rankings.topAlbums.rows[0] = {
  ...rankings.topAlbums.rows[0],
  id: 9,
  title: null,
  artistId: 5,
  artistName: "Album Artist",
  downloadCount: 77,
};

describe("TopAccountsTables", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
      const ranking = endpoint.match(/^admin\/stats\/(\w+)\?/)?.[1];
      return { result: rankings[ranking as keyof typeof rankings] } as any;
    });
  });

  test("links each seller, purchaser and listener to their admin page", async () => {
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
    expect(screen.getByText("Keen Fan").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/users/8"
    );
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("321")).toBeInTheDocument();
  });

  test("shows free downloads and uploads", async () => {
    renderTables();

    await waitFor(() => screen.getByText("Free Artist"));

    expect(screen.getByText("Free Artist").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/artists/4"
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  test("links downloaded albums to their album and artist", async () => {
    renderTables();

    // Untitled albums get a fallback label.
    await waitFor(() => screen.getByText("Untitled"));

    expect(screen.getByText("Untitled").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/track-groups/9"
    );
    expect(screen.getByText("Album Artist").closest("a")).toHaveAttribute(
      "href",
      "/admin/content/artists/5"
    );
    expect(screen.getByText("77")).toBeInTheDocument();
  });

  test("collapses long tables to 10 rows until expanded", async () => {
    renderTables();

    await waitFor(() => screen.getByText("Uploader 10"));
    expect(screen.queryByText("Uploader 11")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Show all 20"));
    expect(screen.getByText("Uploader 20")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Show top 10 only"));
    expect(screen.queryByText("Uploader 11")).not.toBeInTheDocument();
  });

  test("refetches every table for the past year when the period is switched", async () => {
    renderTables();

    expect(api.get).toHaveBeenCalledWith("admin/stats/topSellers?period=month");
    expect(api.get).toHaveBeenCalledWith(
      "admin/stats/topListeners?period=month"
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "year");

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("admin/stats/topSellers?period=year")
    );
    expect(api.get).toHaveBeenCalledWith("admin/stats/topAlbums?period=year");
  });

  test("downloads a table's CSV for the selected period from its menu", async () => {
    renderTables();

    await waitFor(() => screen.getByText("Big Seller"));
    await userEvent.selectOptions(screen.getByRole("combobox"), "year");

    await userEvent.click(
      screen.getByRole("button", { name: "Top 50 Sellers options" })
    );
    await userEvent.click(screen.getByText("Download CSV"));

    expect(api.getFile).toHaveBeenCalledWith(
      "topSellers-year",
      "admin/stats/topSellers?period=year&format=csv",
      "text/csv"
    );
  });
});
