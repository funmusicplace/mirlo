import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

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
        freeDownloads: [
          { id: 4, name: "Free Artist", urlSlug: "free", downloadCount: 42 },
        ],
        uploaders: Array.from({ length: 20 }, (_, index) => ({
          id: 100 + index,
          name: `Uploader ${index + 1}`,
          urlSlug: `uploader-${index + 1}`,
          trackCount: 20 - index,
          trackGroupCount: 1,
        })),
        downloadedAlbums: [
          {
            id: 9,
            title: null,
            artistId: 5,
            artistName: "Album Artist",
            downloadCount: 77,
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

  test("refetches for the past year when the period is switched", async () => {
    renderTables();

    expect(api.get).toHaveBeenCalledWith("admin/topAccounts?period=month");

    await userEvent.selectOptions(screen.getByRole("combobox"), "year");

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("admin/topAccounts?period=year")
    );
  });
});
