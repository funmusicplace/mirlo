import { render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

// jsdom reports a 0x0 layout, so recharts' <ResponsiveContainer> never
// renders its children. Stand in for the pieces Index.tsx uses so we can
// assert on the data/props each chart is wired up with instead.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<unknown>;
  }) => (
    <div data-testid="line-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name?: string }) => (
    <div data-testid="line" data-key={dataKey}>
      {name ?? dataKey}
    </div>
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import Index from "./Index";

function makeStats(overrides: Record<string, unknown> = {}) {
  return {
    result: {
      userSignupsByWeek: [{ week: "2026-01-05", count: 3 }],
      artistSignupsByWeek: [{ week: "2026-01-05", count: 1 }],
      transactionsByWeek: [{ week: "2026-01-05", count: 4 }],
      usdRevenueByWeek: [
        {
          week: "2026-01-05",
          purchasesUsdCents: 1000,
          subscriptionsUsdCents: 500,
          purchasesConvertedUsdCents: 250,
          subscriptionsConvertedUsdCents: 0,
        },
        {
          week: "2026-01-12",
          purchasesUsdCents: 2000,
          subscriptionsUsdCents: 700,
          purchasesConvertedUsdCents: 300,
          subscriptionsConvertedUsdCents: 100,
        },
      ],
      transactionCountByWeek: [
        { week: "2026-01-05", currency: "usd", count: 3 },
        { week: "2026-01-05", currency: "eur", count: 1 },
        { week: "2026-01-12", currency: "usd", count: 5 },
        { week: "2026-01-12", currency: "eur", count: 2 },
      ],
      platformRevenueByWeek: [
        {
          week: "2026-01-05",
          platformCutUsdCents: 100,
          platformCutConvertedUsdCents: 20,
        },
        {
          week: "2026-01-12",
          platformCutUsdCents: 200,
          platformCutConvertedUsdCents: 30,
        },
      ],
      avgMonthlyPlays: 42,
      avgMonthlyActiveUsers: 7,
      avgMonthlyAlbumDownloads: 5,
      ...overrides,
    },
  };
}

describe("admin dashboard Index", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  test("shows a loading state before stats resolve", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    render(<Index />);

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  test("shows an error message when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("Error: Network error")).toBeInTheDocument();
    });
  });

  test("fetches a year of stats on mount", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("admin/stats?days=365");
    });
  });

  test("renders the KPI cards", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() => screen.getByText("Monthly Plays"));

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("renders one USD Revenue line per purchase/subscription series", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() => screen.getByText("USD Revenue Per Week"));

    const chart = screen
      .getByText("USD Revenue Per Week")
      .closest("div") as HTMLElement;
    const lines = within(chart).getAllByTestId("line");
    expect(lines.map((line) => line.dataset.key)).toEqual([
      "purchases",
      "subscriptions",
      "purchasesConverted",
      "subscriptionsConverted",
    ]);
  });

  test("passes one data point per week to the USD Revenue chart", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() => screen.getByText("USD Revenue Per Week"));

    const chart = screen
      .getByText("USD Revenue Per Week")
      .closest("div") as HTMLElement;
    const lineChart = within(chart).getByTestId("line-chart");
    expect(lineChart.dataset.points).toBe("2");
  });

  test("renders a Platform Revenue chart with USD and converted lines", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() => screen.getByText("Platform Revenue Per Week"));

    const chart = screen
      .getByText("Platform Revenue Per Week")
      .closest("div") as HTMLElement;
    const lines = within(chart).getAllByTestId("line");
    expect(lines.map((line) => line.dataset.key)).toEqual([
      "platformCut",
      "platformCutConverted",
    ]);
  });

  test("renders one transaction-count line per currency seen", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    render(<Index />);

    await waitFor(() =>
      screen.getByText("Transaction Count Per Week by Currency")
    );

    const chart = screen
      .getByText("Transaction Count Per Week by Currency")
      .closest("div") as HTMLElement;
    const lines = within(chart).getAllByTestId("line");
    expect(lines.map((line) => line.dataset.key)).toEqual(["eur", "usd"]);
  });
});
