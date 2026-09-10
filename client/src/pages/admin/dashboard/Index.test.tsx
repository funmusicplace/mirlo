import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  AreaChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<unknown>;
  }) => (
    <div data-testid="area-chart" data-points={data.length}>
      {children}
    </div>
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
  Area: ({ dataKey, name }: { dataKey: string; name?: string }) => (
    <div data-testid="area" data-key={dataKey}>
      {name ?? dataKey}
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
  Tooltip: ({ content }: { content?: React.ReactNode }) => <>{content}</>,
  Legend: () => null,
}));

import Index, { StackedTooltip } from "./Index";

function makeStats(overrides: Record<string, unknown> = {}) {
  return {
    result: {
      granularity: "week",
      userSignups: [{ date: "2026-01-05", count: 3 }],
      artistSignups: [{ date: "2026-01-05", count: 1 }],
      revenue: [
        {
          date: "2026-01-05",
          purchasesUsdCents: 1000,
          subscriptionsUsdCents: 500,
          purchasesConvertedUsdCents: 250,
          subscriptionsConvertedUsdCents: 0,
          platformCutUsdCents: 100,
          platformCutConvertedUsdCents: 20,
        },
        {
          date: "2026-01-12",
          purchasesUsdCents: 2000,
          subscriptionsUsdCents: 700,
          purchasesConvertedUsdCents: 300,
          subscriptionsConvertedUsdCents: 100,
          platformCutUsdCents: 200,
          platformCutConvertedUsdCents: 30,
        },
      ],
      transactionCounts: [
        { date: "2026-01-05", currency: "usd", count: 3 },
        { date: "2026-01-05", currency: "eur", count: 1 },
        { date: "2026-01-12", currency: "usd", count: 5 },
        { date: "2026-01-12", currency: "eur", count: 2 },
      ],
      avgMonthlyPlays: 42,
      avgMonthlyActiveUsers: 7,
      avgMonthlyAlbumDownloads: 5,
      ...overrides,
    },
  };
}

const renderDashboard = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Index />
    </QueryClientProvider>
  );

const chartFor = (title: string) =>
  screen.getByText(title).closest("div") as HTMLElement;

describe("admin dashboard Index", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  test("shows a loading state before stats resolve", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  test("shows an error message when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Error: Network error")).toBeInTheDocument();
    });
  });

  test("fetches a year of weekly stats on mount", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "admin/stats?days=365&granularity=week"
      );
    });
  });

  test("refetches monthly stats when the granularity is switched", async () => {
    vi.mocked(api.get).mockImplementation(
      async (endpoint: string) =>
        makeStats(
          endpoint.includes("granularity=month") ? { granularity: "month" } : {}
        ) as any
    );

    renderDashboard();

    await waitFor(() => screen.getByText("USD Revenue Per Week"));

    await userEvent.selectOptions(screen.getByRole("combobox"), "month");

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "admin/stats?days=365&granularity=month"
      );
    });
    await waitFor(() =>
      expect(screen.getByText("USD Revenue Per Month")).toBeInTheDocument()
    );
  });

  test("adds the hovered bands up into a total", () => {
    render(
      <StackedTooltip
        active
        label="Jan 5"
        payload={[
          { name: "Purchases", value: 10, color: "#2a78d6" },
          { name: "Subscriptions", value: 5, color: "#eb6834" },
        ]}
        format={(value) => `$${value}`}
      />
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$15")).toBeInTheDocument();
  });

  test("renders the KPI cards", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => screen.getByText("Monthly Plays"));

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("stacks the USD Revenue purchase/subscription series", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => screen.getByText("USD Revenue Per Week"));

    const areas = within(chartFor("USD Revenue Per Week")).getAllByTestId(
      "area"
    );
    expect(areas.map((area) => area.dataset.key)).toEqual([
      "purchases",
      "subscriptions",
      "purchasesConverted",
      "subscriptionsConverted",
    ]);
  });

  test("passes one data point per bucket to the USD Revenue chart", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => screen.getByText("USD Revenue Per Week"));

    const chart = within(chartFor("USD Revenue Per Week")).getByTestId(
      "area-chart"
    );
    expect(chart.dataset.points).toBe("2");
  });

  test("stacks the Platform Revenue USD and converted series", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => screen.getByText("Platform Revenue Per Week"));

    const areas = within(chartFor("Platform Revenue Per Week")).getAllByTestId(
      "area"
    );
    expect(areas.map((area) => area.dataset.key)).toEqual([
      "platformCut",
      "platformCutConverted",
    ]);
  });

  test("stacks one transaction series per currency seen", async () => {
    vi.mocked(api.get).mockResolvedValue(makeStats() as any);

    renderDashboard();

    await waitFor(() => screen.getByText("Transactions Per Week by Currency"));

    const chart = chartFor("Transactions Per Week by Currency");
    const areas = within(chart).getAllByTestId("area");
    expect(areas.map((area) => area.dataset.key)).toEqual(["eur", "usd"]);
    expect(within(chart).getByTestId("area-chart").dataset.points).toBe("2");
  });
});
